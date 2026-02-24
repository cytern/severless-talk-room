import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface WsApiProps {
  tableName: string;
  layers?: lambda.ILayerVersion[];
  stageName?: string;
}

export class WsApi extends Construct {
  public readonly apiId: string;
  public readonly stageName: string;
  public readonly wsBaseUrl: string;
  public readonly handler: lambda.Function;
  constructor(scope: Construct, id: string, props: WsApiProps) {
    super(scope, id);
    const stage = props.stageName ?? 'prod';
    const handler = new lambda.Function(this, 'WsHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('bin/lambda/ws'),
      handler: 'index.handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: props.tableName,
        WS_CODE_VERSION: '20260223a'
      },
      layers: props.layers,
    });
    this.handler = handler;

    const api = new apigwv2.CfnApi(this, 'WsApi', {
      name: 'HiHereWs',
      protocolType: 'WEBSOCKET',
      routeSelectionExpression: '$request.body.action',
    });

    const region = cdk.Stack.of(this).region;
    const integration = new apigwv2.CfnIntegration(this, 'WsIntegration', {
      apiId: api.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: `arn:aws:apigateway:${region}:lambda:path/2015-03-31/functions/${handler.functionArn}/invocations`,
    });

    const routeDefault = new apigwv2.CfnRoute(this, 'WsRouteDefault', {
      apiId: api.ref,
      routeKey: '$default',
      authorizationType: 'NONE',
      target: `integrations/${integration.ref}`,
    });
    const routeConnect = new apigwv2.CfnRoute(this, 'WsRouteConnect', {
      apiId: api.ref,
      routeKey: '$connect',
      authorizationType: 'NONE',
      target: `integrations/${integration.ref}`,
    });
    const routeDisconnect = new apigwv2.CfnRoute(this, 'WsRouteDisconnect', {
      apiId: api.ref,
      routeKey: '$disconnect',
      authorizationType: 'NONE',
      target: `integrations/${integration.ref}`,
    });

    const deployment = new apigwv2.CfnDeployment(this, 'WsDeployment', {
      apiId: api.ref,
    });
    deployment.addDependency(routeDefault);
    deployment.addDependency(routeConnect);
    deployment.addDependency(routeDisconnect);

    const stageRes = new apigwv2.CfnStage(this, 'WsStage', {
      apiId: api.ref,
      stageName: stage,
      deploymentId: deployment.ref,
    });

    handler.addPermission('InvokeByApigw', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: cdk.Stack.of(this).formatArn({
        service: 'execute-api',
        resource: api.ref,
        resourceName: '*',
      }),
    });

    this.apiId = api.ref;
    this.stageName = stage;
    const base = `wss://${api.ref}.execute-api.${region}.amazonaws.com/${stage}`;
    this.wsBaseUrl = base;
  }
}

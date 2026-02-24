import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export interface HelloApiProps {
  fn: lambda.IFunction;
  locationFn?: lambda.IFunction;
}

export class HelloApi extends Construct {
  public readonly api: apigw.RestApi;
  public readonly helloUrl: string;

  constructor(scope: Construct, id: string, props: HelloApiProps) {
    super(scope, id);
    this.api = new apigw.RestApi(this, 'HelloApi', {
      restApiName: 'HelloApi',
      description: 'API Gateway for /hello endpoint',
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization']
      },
      deployOptions: {
        stageName: 'prod'
      }
    });
    const helloResource = this.api.root.addResource('hello');
    helloResource.addMethod('GET', new apigw.LambdaIntegration(props.fn));
    if (props.locationFn) {
      const loc = this.api.root.addResource('location');
      const integration = new apigw.LambdaIntegration(props.locationFn);
      loc.addMethod('POST', integration);
      // 允许 GET 便于手工访问与健康检查（空 body 也能返回 200）
      loc.addMethod('GET', integration);
    }
    this.helloUrl = `${this.api.url}hello`;
  }
}

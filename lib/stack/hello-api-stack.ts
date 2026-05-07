import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { HelloFunction } from '../constructs/hello-function';
import { LocationFunction } from '../constructs/location-function';
import { HttpSiteApi } from '../constructs/http-site-api';
import { HiHereTable } from '../constructs/hihere-table';
import { ChatWriteFunction } from '../constructs/chat-write-function';
import { ChatListFunction } from '../constructs/chat-list-function';
import { ChatStatusFunction } from '../constructs/chat-status-function';
import { ReleaseBucket } from '../constructs/release-bucket';
import { ReleaseViewerFunction } from '../constructs/release-viewer-function';
import { ReleasePageFunction } from '../constructs/release-page-function';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { AwsSdkV2Layer } from '../constructs/aws-sdk-v2-layer';
import { WsApi } from '../constructs/ws-api';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class HelloApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const helloFn = new HelloFunction(this, 'HelloSvc');
    const locationFn = new LocationFunction(this, 'LocationSvc');
    const httpSite = new HttpSiteApi(this, 'HttpSite', { helloFn: helloFn.fn, locationFn: locationFn.fn });
    // DDB: hi_here (PK here_name STRING, SK heart_time NUMBER)
    const table = new HiHereTable(this, 'HiHere');
    // Chat lambdas with AWS SDK v2 layer
    const awsSdkLayer = new AwsSdkV2Layer(this, 'AwsSdkLayer');
    const chatWrite = new ChatWriteFunction(this, 'ChatWrite', { tableName: table.table.tableName, layers: [awsSdkLayer.layer] });
    const chatList = new ChatListFunction(this, 'ChatList', { tableName: table.table.tableName, layers: [awsSdkLayer.layer] });
    const chatStatus = new ChatStatusFunction(this, 'ChatStatus', { tableName: table.table.tableName, layers: [awsSdkLayer.layer] });
    table.table.grantReadWriteData(chatWrite.fn);
    table.table.grantReadData(chatList.fn);
    table.table.grantReadData(chatStatus.fn);
    // WebSocket API
    const ws = new WsApi(this, 'Ws', { tableName: table.table.tableName, layers: [awsSdkLayer.layer], stageName: 'prod' });
    table.table.grantReadWriteData(ws.handler);
    // Pass WS endpoint to writer for push
    const region = cdk.Stack.of(this).region;
    const account = cdk.Stack.of(this).account;
    const wsBase = `https://${ws.apiId}.execute-api.${region}.amazonaws.com/${ws.stageName}`;
    chatWrite.fn.addEnvironment('WS_ENDPOINT', wsBase);
    // Allow writer to post to connections
    chatWrite.fn.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${region}:${account}:${ws.apiId}/${ws.stageName}/POST/@connections/*`
      ]
    }));
    // Allow WS handler to post to connections
    ws.handler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['execute-api:ManageConnections'],
      resources: [
        `arn:aws:execute-api:${region}:${account}:${ws.apiId}/${ws.stageName}/POST/@connections/*`
      ]
    }));
    // Routes
    const writeInt = new integrations.HttpLambdaIntegration('ChatWriteInt', chatWrite.fn);
    const listInt = new integrations.HttpLambdaIntegration('ChatListInt', chatList.fn);
    const statusInt = new integrations.HttpLambdaIntegration('ChatStatusInt', chatStatus.fn);
    httpSite.api.addRoutes({ path: '/api/message', methods: [apigwv2.HttpMethod.POST], integration: writeInt });
    httpSite.api.addRoutes({ path: '/api/messages', methods: [apigwv2.HttpMethod.GET], integration: listInt });
    httpSite.api.addRoutes({ path: '/api/messages/status', methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.OPTIONS], integration: statusInt });
    new cdk.CfnOutput(this, 'ProdHelloUrl', { value: `${httpSite.baseUrl}/api/hello`, exportName: 'ProdHelloUrl' });
    new cdk.CfnOutput(this, 'HelloApiEndpoint', { value: `${httpSite.baseUrl}/`, exportName: 'HelloApiEndpoint' });
    new cdk.CfnOutput(this, 'WsBaseUrl', { value: `wss://${ws.apiId}.execute-api.${region}.amazonaws.com/${ws.stageName}`, exportName: 'WsBaseUrl' });

    const mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `hihere-media-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [{
        allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        exposedHeaders: ['ETag']
      }],
      lifecycleRules: [{
        transitions: [{ storageClass: s3.StorageClass.GLACIER_INSTANT_RETRIEVAL, transitionAfter: cdk.Duration.days(2) }]
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });
    const signUpload = new lambda.Function(this, 'SignUploadFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('bin/lambda/upload/sign'),
      timeout: cdk.Duration.seconds(10),
      environment: { BUCKET_NAME: mediaBucket.bucketName },
      layers: [awsSdkLayer.layer]
    });
    const signGet = new lambda.Function(this, 'SignGetFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('bin/lambda/upload/get'),
      timeout: cdk.Duration.seconds(10),
      environment: { BUCKET_NAME: mediaBucket.bucketName },
      layers: [awsSdkLayer.layer]
    });
    mediaBucket.grantPut(signUpload, '*');
    mediaBucket.grantRead(signGet, '*');
    const upInt = new integrations.HttpLambdaIntegration('SignUploadInt', signUpload);
    const getInt = new integrations.HttpLambdaIntegration('SignGetInt', signGet);
    httpSite.api.addRoutes({ path: '/api/upload-url', methods: [apigwv2.HttpMethod.POST], integration: upInt });
    httpSite.api.addRoutes({ path: '/api/get-url', methods: [apigwv2.HttpMethod.GET], integration: getInt });
    new cdk.CfnOutput(this, 'MediaBucketName', { value: mediaBucket.bucketName });

    // AMap static map proxy (no API key in frontend)
    const amapKey = process.env.AMAP_KEY || this.node.tryGetContext('amapKey') || '';
    const amapParamName = this.node.tryGetContext('amapParamName') || process.env.AMAP_PARAM_NAME || '/hihere/amap_key';
    const mapStatic = new lambda.Function(this, 'AmapStaticFn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('bin/lambda/map/static'),
      timeout: cdk.Duration.seconds(10),
      environment: { AMAP_KEY: amapKey, AMAP_PARAM_NAME: amapParamName },
      layers: [awsSdkLayer.layer]
    });
    // Allow Lambda to read SSM parameter if provided
    const paramArn = `arn:aws:ssm:${region}:${account}:parameter${amapParamName.startsWith('/') ? '' : '/'}${amapParamName.replace(/^\//,'')}`;
    mapStatic.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ssm:GetParameter'],
      resources: [paramArn]
    }));
    const mapInt = new integrations.HttpLambdaIntegration('AmapStaticInt', mapStatic);
    httpSite.api.addRoutes({ path: '/api/map/static', methods: [apigwv2.HttpMethod.GET], integration: mapInt });

    // Release Viewer
    const releaseBucket = new ReleaseBucket(this, 'ReleaseBucket');
    const releaseViewer = new ReleaseViewerFunction(this, 'ReleaseViewer', {
      bucketName: releaseBucket.bucket.bucketName,
      layers: [awsSdkLayer.layer]
    });
    releaseBucket.bucket.grantRead(releaseViewer.fn);
    const releaseViewerInt = new integrations.HttpLambdaIntegration('ReleaseViewerInt', releaseViewer.fn);
    httpSite.api.addRoutes({ path: '/viewer/release', methods: [apigwv2.HttpMethod.GET], integration: releaseViewerInt });
    
    // Release Web Page
    const releasePage = new ReleasePageFunction(this, 'ReleasePage', {
      bucketName: releaseBucket.bucket.bucketName,
      layers: [awsSdkLayer.layer]
    });
    releaseBucket.bucket.grantRead(releasePage.fn);
    const releasePageInt = new integrations.HttpLambdaIntegration('ReleasePageInt', releasePage.fn);
    httpSite.api.addRoutes({ path: '/viewer', methods: [apigwv2.HttpMethod.GET], integration: releasePageInt });
    httpSite.api.addRoutes({ path: '/viewer/{proxy+}', methods: [apigwv2.HttpMethod.GET], integration: releasePageInt });

    new cdk.CfnOutput(this, 'ReleaseBucketName', { value: releaseBucket.bucket.bucketName, exportName: 'ReleaseBucketName' });
    new cdk.CfnOutput(this, 'ReleasePageUrl', { value: `${httpSite.baseUrl}/viewer`, exportName: 'ReleasePageUrl' });
  }
}

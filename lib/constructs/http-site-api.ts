import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cdk from 'aws-cdk-lib';

export interface HttpSiteApiProps {
  helloFn: lambda.IFunction;
  locationFn?: lambda.IFunction;
}

export class HttpSiteApi extends Construct {
  public readonly api: apigwv2.HttpApi;
  public readonly bucket: s3.Bucket;
  public readonly baseUrl: string;

  constructor(scope: Construct, id: string, props: HttpSiteApiProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `hihere-site-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`,
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
        blockPublicPolicy: false,
      }),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.api = new apigwv2.HttpApi(this, 'HttpSiteApi', {
      apiName: 'HiHere',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [apigwv2.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
      },
    });

    const helloInt = new integrations.HttpLambdaIntegration('HelloInt', props.helloFn);
    const s3Base = `http://${this.bucket.bucketWebsiteDomainName}`;
    const s3IndexInt = new integrations.HttpUrlIntegration('S3IndexInt', `${s3Base}/index.html`);
    const s3ProxyInt = new integrations.HttpUrlIntegration('S3ProxyInt', s3Base, {
      parameterMapping: new apigwv2.ParameterMapping().overwritePath(apigwv2.MappingValue.requestPath()),
    });

    this.api.addRoutes({
      path: '/',
      methods: [apigwv2.HttpMethod.GET],
      integration: s3IndexInt,
    });
    this.api.addRoutes({
      path: '/{proxy+}',
      methods: [apigwv2.HttpMethod.GET],
      integration: s3ProxyInt,
    });
    this.api.addRoutes({
      path: '/api/hello',
      methods: [apigwv2.HttpMethod.GET],
      integration: helloInt,
    });
    if (props.locationFn) {
      const locInt = new integrations.HttpLambdaIntegration('LocationInt', props.locationFn);
      this.api.addRoutes({
        path: '/api/location',
        methods: [apigwv2.HttpMethod.POST, apigwv2.HttpMethod.GET],
        integration: locInt,
      });
    }

    this.baseUrl = this.api.apiEndpoint;

    new cdk.CfnOutput(this, 'HttpApiBaseUrl', { value: this.baseUrl });
    new cdk.CfnOutput(this, 'SiteBucketName', { value: this.bucket.bucketName });
  }
}

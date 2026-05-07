import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface ReleasePageFunctionProps {
  bucketName: string;
  layers?: lambda.ILayerVersion[];
}

export class ReleasePageFunction extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: ReleasePageFunctionProps) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/hihere-release-page`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'Fn', {
      functionName: 'hihere-release-page',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('bin/lambda/viewer/page'),
      timeout: cdk.Duration.seconds(10),
      environment: { BUCKET_NAME: props.bucketName },
      layers: props.layers,
      logGroup
    });
    logGroup.grantWrite(this.fn);
  }
}

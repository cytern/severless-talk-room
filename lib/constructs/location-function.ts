import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';

export class LocationFunction extends Construct {
  public readonly fn: lambda.Function;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'LocationLogGroup', {
      logGroupName: `/aws/lambda/hihere-location`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'LocationFunction', {
      functionName: 'hihere-location',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(fs.readFileSync('bin/lambda/location/index.js', 'utf8')),
      timeout: cdk.Duration.seconds(5),
      logGroup
    });
    logGroup.grantWrite(this.fn);
  }
}

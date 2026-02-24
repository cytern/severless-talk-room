import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';

export interface HelloFunctionProps {}

export class HelloFunction extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, _props?: HelloFunctionProps) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'HelloLogGroup', {
      logGroupName: `/aws/lambda/hihere-hello`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'HelloFunction', {
      functionName: 'hihere-hello',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(fs.readFileSync('bin/lambda/hello/index.js', 'utf8')),
      timeout: cdk.Duration.seconds(5),
      logGroup
    });
    logGroup.grantWrite(this.fn);
  }
}

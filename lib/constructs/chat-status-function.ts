import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';

export interface ChatStatusFunctionProps {
  tableName: string;
  layers?: lambda.ILayerVersion[];
}

export class ChatStatusFunction extends Construct {
  public readonly fn: lambda.Function;
  constructor(scope: Construct, id: string, props: ChatStatusFunctionProps) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'ChatStatusLog', {
      logGroupName: `/aws/lambda/hihere-status`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'ChatStatusFn', {
      functionName: 'hihere-status',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(fs.readFileSync('bin/lambda/chat/status/index.js', 'utf8')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: props.tableName
      },
      layers: props.layers,
      logGroup
    });
    logGroup.grantWrite(this.fn);
  }
}

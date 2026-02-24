import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';

export interface ChatListFunctionProps {
  tableName: string;
  layers?: lambda.ILayerVersion[];
}

export class ChatListFunction extends Construct {
  public readonly fn: lambda.Function;
  constructor(scope: Construct, id: string, props: ChatListFunctionProps) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'ChatListLog', {
      logGroupName: `/aws/lambda/hihere-list`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'ChatListFn', {
      functionName: 'hihere-list',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(fs.readFileSync('bin/lambda/chat/list/index.js', 'utf8')),
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

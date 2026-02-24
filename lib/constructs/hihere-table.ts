import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class HiHereTable extends Construct {
  public readonly table: dynamodb.Table;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.table = new dynamodb.Table(this, 'HiHereTable', {
      tableName: 'hi_here',
      partitionKey: { name: 'here_name', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'heart_time', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 1,
      writeCapacity: 1,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
  }
}

import { IAuditPublisher } from '../contracts/IAuditPublisher';

export class CompositeAuditPublisher implements IAuditPublisher {
  constructor(private publishers: IAuditPublisher[]) {}

  async publish(event: any): Promise<void> {
    await Promise.allSettled(this.publishers.map(pub => pub.publish(event)));
  }
}

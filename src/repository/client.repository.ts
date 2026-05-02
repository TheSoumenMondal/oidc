import type { Document } from "mongoose";
import { Client } from "../models/client.model.js";
import type { CreateClientRequest } from "../validator/client.validator.js";

class ClientRepository {
  public async getClientById(clientId: string): Promise<Document | null> {
    const client = await Client.findOne({ clientId: clientId });
    return client;
  }

  public createClient(
    data: CreateClientRequest & { clientId: string; clientSecret: string }
  ): Promise<Document> {
    return Client.create({
      appName: data.appName,
      appUrl: data.appUrl,
      clientId: data.clientId,
      clientSecret: data.clientSecret,
      redirectUrls: data.redirectUrl,
    });
  }
}

export { ClientRepository };

import crypto from "node:crypto";
import type { ClientRepository } from "../repository/client.repository.js";
import type { CreateClientRequest } from "../validator/client.validator.js";

class ClientService {
  private readonly clientRepository: ClientRepository;
  constructor(clientRepository: ClientRepository) {
    this.clientRepository = clientRepository;
  }

  async createClient(data: CreateClientRequest) {
    const clientId = crypto.randomUUID();
    const clientSecret = crypto.randomBytes(32).toString("hex");

    const clientData = {
      ...data,
      clientId,
      clientSecret,
    };

    const existingClient = await this.clientRepository.getClientById(clientId);
    if (existingClient) {
      throw new Error("Client with this ID already exists");
    }

    const client = await this.clientRepository.createClient(clientData);
    return client;
  }
}

export { ClientService };

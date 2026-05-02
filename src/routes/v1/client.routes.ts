import express from "express";
import { ClientController } from "../../controllers/client.controller.js";
import { ClientRepository } from "../../repository/client.repository.js";
import { ClientService } from "../../services/client.service.js";

const clientRepository = new ClientRepository();
const clientService = new ClientService(clientRepository);
const clientController = new ClientController(clientService);

const clientRouter: express.Router = express.Router();
clientRouter.post("/", clientController.createClient.bind(clientController));

export { clientRouter };

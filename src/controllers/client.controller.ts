import type { Request, Response } from "express";
import type { ClientService } from "../services/client.service.js";
import { ApiError } from "../utils/api-error.js";
import { validateCreateClientRequest } from "../validator/client.validator.js";

class ClientController {
  private readonly clientService: ClientService;
  constructor(clientService: ClientService) {
    this.clientService = clientService;
  }

  async createClient(req: Request, res: Response) {
    const data = req.body;
    const parsedData = await validateCreateClientRequest.safeParseAsync(data);
    if (!parsedData.success) {
      throw ApiError.zodError(parsedData.error);
    }

    const result = await this.clientService.createClient(parsedData.data);
    res.status(201).json({
      success: true,
      data: result,
      error: null,
      message: "Client Created Successfully",
    });
  }
}

export { ClientController };

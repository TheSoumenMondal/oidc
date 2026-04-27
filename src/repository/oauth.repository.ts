import { User } from "../models/user.model.js";
import type { RegisterRequest } from "../validator/oauth.validator.js";

class OAuthRepository {
  async authenticateUser(email: string) {
    const user = await User.findOne({
      email: email,
    }).select("+hashPassword");
    return user;
  }

  async createUser(data: RegisterRequest) {
    const user = await User.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      hashPassword: data.password,
      profilePicture: data.profilePicture ?? (data.profilePicture || ""),
    });
    return user;
  }

  async getUserById(id: string) {
    const user = await User.findById(id);
    return user;
  }
}

export { OAuthRepository };

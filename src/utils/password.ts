import bcrypt from "bcryptjs";

export const hashUtils = {
  async hashPassword(password: string): Promise<string> {
    const salt = bcrypt.genSaltSync(12);
    return await bcrypt.hash(password, salt);
  },

  async comparePassword(password: string, hashPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashPassword);
  },
};

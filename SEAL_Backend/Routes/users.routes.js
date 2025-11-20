import { signupNewUser } from "../Controller/users.controller.js";

export function usersRoutes(app)
{
    app.post("/signup",signupNewUser);
}
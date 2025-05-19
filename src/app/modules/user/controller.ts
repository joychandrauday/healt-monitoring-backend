import { Request, Response } from 'express';
import { UserService } from './service';
import { asyncHandler } from '../../utils/asyncHandler';
import sendResponse from '../../utils/sendResponse';
import { StatusCodes } from "http-status-codes";
const userService = new UserService();

export const registerUser = asyncHandler(async (req: Request, res: Response) => {
    console.log(req.body);
    const { user, token } = await userService.registerUser(req.body);

    sendResponse(res, {
        statusCode: StatusCodes.CREATED,
        success: true,
        message: "User created successfully",
        data: { user, token },
    });
});

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { user, token } = await userService.loginUser(req.body.email, req.body.password);
    res.status(200).json({ user, token });
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.getUserById(req.params.id);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "User Retrieved successfully",
        data: user,
    });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await userService.updateUser(req.params.id, req.body);
    res.status(200).json(user);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
    await userService.deleteUser(req.params.id);
    res.status(204).send();
});

export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { users, meta } = await userService.getAllUsers(req.query);
    sendResponse(res, {
        statusCode: StatusCodes.ACCEPTED,
        success: true,
        message: "User Retrieved successfully",
        data: { users, meta },
    });
});
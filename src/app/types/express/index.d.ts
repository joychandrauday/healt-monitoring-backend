// src/types/express/index.d.ts

import 'express';

declare global {
    namespace Express {
        interface User {
            id: string;
            email: string;
            role: string;
        }

        interface Request {
            user?: User;
        }
    }
}
declare global {
    var io: import("socket.io").Server;
}

import { Request, Response } from 'express';
import { SessionsClient, v2 } from '@google-cloud/dialogflow';

class DialogFlowController {
  private projectId: string;

  private sessionsClient: v2.SessionsClient;

  constructor() {
    const privateKey = process.env.DIALOGFLOW_PRIVATE_KEY?.replace(/\\n/g, '\n');
    this.projectId = process.env.DIALOGFLOW_PROJECT_ID || '';
    this.sessionsClient = new SessionsClient({
      credentials: {
        client_email: process.env.DIALOGFLOW_EMAIL,
        private_key: privateKey,
      },
    });
  }

  public sendMessage = async (req: Request, res: Response): Promise<Response> => {
    const { message }: { message: string; } = req.body;
    const token = req.headers.authorization;
    if (!token) return res.status(400).send();
    const sessionPath = this.sessionsClient.projectAgentSessionPath(this.projectId, token);

    const response = await this.sessionsClient.detectIntent({
      session: sessionPath,
      queryInput: {
        text: {
          text: message,
          languageCode: 'en',
        },
      },
    });
    return res.json(response);
  }
}

export default new DialogFlowController();

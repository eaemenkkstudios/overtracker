import { Response, Request } from 'express';
import basicAuth from 'basic-auth';
import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';

import Encrypter from '../utils/Encrypter';
import User from '../models/User';

class UserController {
  private mailer: Mail;

  private senderEmailAddress?: string;

  constructor() {
    this.senderEmailAddress = process.env.SENDER_EMAIL_ADDRESS;
    this.mailer = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: this.senderEmailAddress,
        pass: process.env.SENDER_EMAIL_PASSWORD,
      },
    });
  }

  public async create(req: Request, res: Response): Promise<Response> {
    const auth = basicAuth(req);
    if (!auth) return res.status(400).send();

    const { name: email, pass: password } = auth;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).send();

    const user = {
      email,
      password: Encrypter.hashPassword(password),
    };
    return User.create(user)
      .then((newUser) => res.json({ id: newUser._id }))
      .catch((err) => res.json(err));
  }

  public forgotPassword = async (req: Request, res: Response): Promise<Response> => {
    const { email }: { email: string; } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).send();

    user.resetPasswordToken = Encrypter.randomString(256);
    user.resetPasswordExpires = new Date().getTime() + 86400000;
    await user.save();

    return this.mailer.sendMail({
      from: this.senderEmailAddress,
      to: user.email,
      subject: `Password Recovery for ${user.email}`,
      html: `<p>Hi,</p>
      <p>A password reset was requested for the account associated with the ${user.email} email address, click the link bellow to change your password:</p>
      <p><a href="https://${req.hostname}/forgotpassword/${user.resetPasswordToken}">https://${req.hostname}/forgotpassword/${user.resetPasswordToken}</a></p>
      <p>If you didn't request this change, please ignore this email.</p>
      <p>Overtracker Team.</p>
      `,
    })
      .then(() => res.status(200).send())
      .catch(() => res.status(400).send());
  }

  public async forgotPasswordPage(req: Request, res: Response): Promise<void> {
    const { token } = req.params;
    const user = await User.findOne({ resetPasswordToken: token });
    if (!user || (user.resetPasswordExpires || 0) < new Date().getTime()) {
      return res.redirect('/404');
    }

    return res.render('forgotPassword', { userEmail: user.email, token });
  }

  public async resetPassword(req: Request, res: Response): Promise<void> {
    const { token, newPass, confirmNewPass }:
    {token: string, newPass: string, confirmNewPass: string} = req.body;

    if (newPass !== confirmNewPass) return res.render('404');

    const user = await User.findOne({ resetPasswordToken: token });
    if (!user || (user.resetPasswordExpires || 0) < new Date().getTime()) {
      return res.redirect('/404');
    }

    user.password = Encrypter.hashPassword(newPass);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return res.render('success');
  }
}

export default new UserController();

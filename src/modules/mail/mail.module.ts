import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MAIL_PORT } from "./application/ports/mail.port";
import { MailService } from "./application/mail.service";
import { ConsoleMailAdapter } from "./infrastructure/adapters/console-mail.adapter";
import { BrevoMailAdapter } from "./infrastructure/adapters/brevo-mail.adapter";

@Module({
  imports: [ConfigModule],
  providers: [
    MailService,
    ConsoleMailAdapter,
    BrevoMailAdapter,
    {
      provide: MAIL_PORT,
      inject: [ConfigService, ConsoleMailAdapter, BrevoMailAdapter],
      useFactory: (
        config: ConfigService,
        console: ConsoleMailAdapter,
        brevo: BrevoMailAdapter,
      ) => {
        const provider = (config.get<string>("EMAIL_PROVIDER") ?? "console")
          .trim()
          .toLowerCase();
        if (provider === "brevo") {
          const key = config.get<string>("EMAIL_API_KEY")?.trim();
          if (!key) {
            Logger.warn(
              "EMAIL_API_KEY em falta — a usar console. Ver docs/EMAIL_BREVO.md",
              "MailModule",
            );
            return console;
          }
          return brevo;
        }
        if (provider !== "console") {
          Logger.warn(
            `EMAIL_PROVIDER="${provider}" desconhecido — a usar console`,
            "MailModule",
          );
        }
        return console;
      },
    },
  ],
  exports: [MAIL_PORT, MailService],
})
export class MailModule {}

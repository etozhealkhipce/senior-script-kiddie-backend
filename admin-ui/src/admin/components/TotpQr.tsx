import { QRCodeSVG } from "qrcode.react";
import { type FC } from "react";
import type { TotpSetup } from "../auth/api";

export const TotpQr: FC<{ totp: TotpSetup }> = ({ totp }) => (
  <div className="flex flex-col items-center gap-2 my-3">
    <div className="bg-white p-2 rounded-md">
      <QRCodeSVG value={totp.otpauthUri} size={168} />
    </div>
    <code className="text-[11.5px] text-muted text-center break-all select-all">
      {totp.secret.match(/.{1,4}/g)?.join(" ")}
    </code>
  </div>
);

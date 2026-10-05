"use client";

import Image from 'next/image';
import type { ReactNode } from 'react';

export function AuthScreenShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#111416] p-8 max-[820px]:p-[18px] max-[480px]:place-items-stretch max-[480px]:p-0">
      <video
        aria-hidden="true"
        autoPlay
        className="absolute inset-0 h-full w-full object-cover object-center motion-reduce:hidden"
        loop
        muted
        playsInline
      >
        <source src="/media/login-background.mp4" type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[rgba(7,10,11,0.7)] [backdrop-filter:saturate(.72)]"
      />

      <section className="relative z-[1] grid min-h-[510px] w-full max-w-[1030px] grid-cols-[1.06fr_0.94fr] overflow-hidden rounded-3xl border border-white/10 bg-[#15191b] shadow-[0_28px_80px_rgba(0,0,0,0.52)] max-[820px]:max-w-[520px] max-[820px]:grid-cols-1 max-[480px]:min-h-screen max-[480px]:rounded-none max-[480px]:border-0">
        <div className="flex flex-col items-center justify-center gap-8 bg-linear-to-b from-[#011a1d] to-[#001214] px-[66px] py-[54px] text-center max-[820px]:gap-[18px] max-[820px]:px-9 max-[820px]:py-[30px] max-[480px]:px-7 max-[480px]:py-6">
          <Image
            alt="Helpdesk"
            className="h-auto w-full max-w-[365px] max-[820px]:max-w-[290px]"
            height={600}
            priority
            src="/branding/helpdesk-logo-white.png"
            width={1200}
          />

          <div className="max-w-[430px] max-[480px]:hidden">
            <h1 className="m-0 text-[clamp(22px,2.25vw,27px)] leading-[1.08] font-bold text-[#f5f8f6]">
              Gestão inteligente para uma operação mais eficiente
            </h1>
            <p className="mt-4 mb-0 text-[15px] leading-[1.58] text-[#b8c0bd] max-[820px]:hidden">
              Mais controle, agilidade e visão estratégica; mantendo o fluxo e
              a qualidade operacional que mantêm a engrenagem sempre em movimento.
            </p>
          </div>
        </div>

        <div className="flex flex-col bg-linear-to-b from-[#1f2325] to-[#0e1113] px-[50px] pt-[52px] pb-[34px] text-[#f7f9f8] max-[820px]:px-[30px] max-[820px]:pt-[34px] max-[820px]:pb-7 max-[480px]:px-6 max-[480px]:pt-8 max-[480px]:pb-[26px]">
          <div>
            <h2 className="m-0 text-[clamp(29px,3vw,36px)] leading-[1.05] font-bold">
              {title}
            </h2>
            <p className="mt-2.5 mb-0 text-[15px] leading-6 text-[#939d99]">
              {description}
            </p>
          </div>

          <div className="mt-[30px]">{children}</div>

          <div className="mt-auto flex justify-center pt-[30px]">
            <Image
              alt="Nível 3"
              className="h-auto w-[68px]"
              height={3863}
              src="/branding/nivel3-logo.png"
              width={8334}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export const authControlClass =
  'min-h-[46px] w-full rounded-[7px] border border-[#444b4e] bg-[rgba(8,11,12,0.58)] px-3 text-[#f7f9f8] outline-none transition placeholder:text-[#737c79] focus:border-[#50f68b] focus:ring-3 focus:ring-[rgba(80,246,139,0.12)] disabled:cursor-not-allowed disabled:opacity-60';

export const authPrimaryButtonClass =
  'min-h-[46px] w-full rounded-[7px] border border-[#50f68b] bg-[#50f68b] px-4 text-[15px] font-extrabold text-[#07120b] transition hover:bg-[#6ff89d] disabled:cursor-not-allowed disabled:opacity-60';

export const authBackLinkClass =
  'text-xs font-bold text-[#50f68b] transition hover:text-[#6ff89d] hover:underline';

export const authErrorClass =
  'rounded-lg border border-[rgba(255,120,120,0.28)] bg-[rgba(130,34,34,0.2)] px-3 py-2.5 text-[13px] text-[#ffcaca]';

export const authSuccessClass =
  'rounded-lg border border-[rgba(80,246,139,0.28)] bg-[rgba(25,112,58,0.2)] px-3 py-3 text-[13px] leading-5 text-[#a7f7c2]';

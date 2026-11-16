import { count, outOf } from "@/design/copy";
import { speed, thickness, warmth } from "@/design/encodings";
import { PaperCard } from "@/ui/PaperCard";
import type { Token, Tokens } from "./read-tokens";
import { Section } from "./Section";

const STEPS = [0, 0.25, 0.5, 0.75, 1];

function Swatch({ token, css }: { token: Token; css: string }) {
  return (
    <li data-token={token.name} className="flex items-center gap-3">
      <span
        className="size-12 shrink-0 rounded-control border border-hairline"
        style={{ background: css }}
      />
      <span className="flex flex-col text-sm">
        <span className="font-medium text-ink">{token.name}</span>
        <code className="text-xs text-ink-soft">{token.value}</code>
      </span>
    </li>
  );
}

export function TokenSections({ tokens }: { tokens: Tokens }) {
  return (
    <>
      <Section
        title="Palette"
        note="The raw paper, ink and meaning colours. Night mode reuses them."
      >
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {tokens.palette.map((token) => (
            <Swatch key={token.name} token={token} css={token.value} />
          ))}
        </ul>
      </Section>

      <Section
        title="Colours"
        note="What each colour means. Clay appears only on things you can touch or should look at next."
      >
        <ul className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {tokens.color.map((token) => (
            <Swatch key={token.name} token={token} css={token.value} />
          ))}
        </ul>
      </Section>

      <Section
        title="Type"
        note="Fraunces for headlines, Inter for reading. Numbers are rare and soft."
      >
        <div className="flex flex-col gap-4">
          {tokens.font.map((token) => (
            <p key={token.name} data-token={token.name} className="flex flex-col gap-1">
              <code className="text-xs text-ink-soft">{token.name}</code>
              <span className={`text-3xl ${token.name}`}>A neuron is a tiny voter</span>
            </p>
          ))}
          <p className="flex flex-col gap-1">
            <code className="text-xs text-ink-soft">numeral</code>
            <span className="numeral text-3xl">98 out of 100</span>
          </p>
        </div>
      </Section>

      <Section
        title="Shape and depth"
        note="Flat paper. The only shadow is a soft lift while something is dragged."
      >
        <ul className="flex flex-wrap gap-6">
          {tokens.radius.map((token) => (
            <li
              key={token.name}
              data-token={token.name}
              className="flex flex-col items-center gap-2 text-xs text-ink-soft"
            >
              <span
                className="size-16 border border-hairline bg-inset"
                style={{ borderRadius: token.value }}
              />
              {token.name}
            </li>
          ))}
          {tokens.shadow.map((token) => (
            <li
              key={token.name}
              data-token={token.name}
              className="flex flex-col items-center gap-2 text-xs text-ink-soft"
            >
              <span className="size-16 rounded-card bg-card" style={{ boxShadow: token.value }} />
              {token.name}
            </li>
          ))}
          {tokens.easing.map((token) => (
            <li
              key={token.name}
              data-token={token.name}
              className="flex flex-col items-center gap-2 text-xs text-ink-soft"
            >
              <code className="flex h-16 items-center text-ink">{token.value}</code>
              {token.name}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        title="Encodings"
        note="Thicker means stronger, warmer means a bigger mistake, faster means busier."
      >
        <PaperCard className="grid w-full gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2" data-token="thickness">
            <span className="text-sm font-medium">Strength → thickness</span>
            {STEPS.map((step) => (
              <span
                key={step}
                className="block rounded-pill bg-flow"
                style={{ height: thickness(step) }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2" data-token="warmth">
            <span className="text-sm font-medium">Mistake → warmth</span>
            <span className="flex gap-1">
              {STEPS.map((step) => (
                <span
                  key={step}
                  className="h-8 flex-1 rounded-inner"
                  style={{ background: warmth(step) }}
                />
              ))}
            </span>
          </div>
          <div className="flex flex-col gap-2 text-sm" data-token="speed">
            <span className="font-medium">Activity → time to cross</span>
            {STEPS.map((step) => (
              <span
                key={step}
                className="block h-1.5 rounded-pill bg-flow"
                style={{ width: `${(speed(step) / speed(0)) * 100}%` }}
              />
            ))}
            <span className="text-xs text-ink-soft">Quiet at the top, busy at the bottom.</span>
          </div>
        </PaperCard>
      </Section>

      <Section
        title="Numbers in words"
        note="Numbers reach the screen only through design/copy.ts."
      >
        <ul className="flex flex-col gap-1 text-sm" data-token="copy">
          <li>0.983 → “{outOf(0.983)}”</li>
          <li>7 → “{count(7)}”</li>
          <li>12,400 → “{count(12_400)}”</li>
        </ul>
      </Section>
    </>
  );
}

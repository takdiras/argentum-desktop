/**
 * The "Board layout" section of the Preferences panel (desktop app only). Hooked into upstream's
 * `PreferencesPanel` by a one-line patch; reuses its stylesheet so it looks native.
 */
import s from '@/components/preferences/Preferences.module.css'
import { useBoardLayout, type BoardLayout } from './arenaLayoutStore'

const OPTIONS: readonly { value: BoardLayout; label: string; hint: string }[] = [
  {
    value: 'arena',
    label: 'Arena',
    hint: 'Compact permanents showing just a name and the art, with power and toughness at the bottom-right. Lands sit bottom-left and enchantments and artifacts bottom-right. Your own battlefield gets the larger share of the screen; the opponent’s is packed into the upper part.',
  },
  {
    value: 'classic',
    label: 'Classic',
    hint: 'Upstream’s layout: full card faces, creatures in the front row, lands and everything else behind them.',
  },
]

export function BoardLayoutSetting() {
  const layout = useBoardLayout((st) => st.layout)
  const setLayout = useBoardLayout((st) => st.setLayout)
  const current = OPTIONS.find((o) => o.value === layout)

  return (
    <section className={s.section}>
      <header className={s.sectionHead}>
        <h2 className={s.sectionTitle}>Board layout</h2>
        <p className={s.sectionLede}>How permanents are drawn and arranged on the battlefield. Changes apply immediately.</p>
      </header>
      <div className={s.segmented} role="radiogroup" aria-label="Board layout">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === layout}
            className={s.segment}
            data-active={o.value === layout}
            onClick={() => setLayout(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {current && <p className={s.hint} style={{ marginTop: 10 }}>{current.hint}</p>}
    </section>
  )
}

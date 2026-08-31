import { Fragment } from 'react'
import { money, moneyRange } from '../lib/format.js'
import { defTitle } from '../lib/definitions.js'
import {
  familyLabel,
  groupNamedByFamily,
  parsePlayerSlug,
  parsePosFamily,
  playerHash,
} from '../lib/nilHistory.js'
import NilHistoryChart from './NilHistoryChart.jsx'
import AllocationFootnote from './AllocationFootnote.jsx'

function onActivate(fn) {
  return (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fn()
    }
  }
}

export default function NamedRoster({ school, season, open, onToggle, includeAlumni, history }) {
  const named = school._named
  const groups = groupNamedByFamily(named)
  const openFamily = parsePosFamily(open)
  const openPlayer = parsePlayerSlug(open)
  const playerRow = openPlayer && history?.playerSeries?.[openPlayer]
  const seasonPoint =
    history?.familySeries?.qb?.find((p) => p.year === season) ||
    Object.values(history?.familySeries || {})
      .flat()
      .find((p) => p.year === season) ||
    null

  if (!named?.players?.length) {
    return (
      <section>
        <h2>Roster</h2>
        <p className="lede tight">No verified public football roster names on the desk for this school.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 title={defTitle('rosterNamed')}>
        Roster {named.namesOnly ? null : <i className="dot modeled" />}
      </h2>
      <p className="lede tight">
        {named.namesOnly
          ? `Public ${season} football names from the ESPN team roster. No modeled NIL share — this season has names but no school modeled midpoint.`
          : school.nil.modeled?.era === 'collective'
            ? `Public ${season} football names, each a modeled share of this school’s pot. Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. The pot is the booked school cell when one exists; otherwise the collective-era modeled band. Collective 990 is a cited side lane, not the pot. Click a position for that group’s year history.`
            : `Public ${season} football names, each a modeled share of this school’s pot. Position dollars are an allocation of the school pot across that year’s named roster, not reported player contracts. The pot is the booked school cell when one exists; otherwise the on-desk modeled band. Collective 990 is a cited side lane, not the pot. Click a position for that group’s year history.`}
      </p>
      {named.namesOnly ? null : (
        <AllocationFootnote
          className="nil-fn-roster"
          point={seasonPoint}
          shareLabel="position"
          kind="position"
        />
      )}
      <div className="table-scroll named-scroll">
        <table className="roster named">
          <thead>
            <tr>
              <th>Player</th>
              <th>Pos</th>
              <th>Class</th>
              <th className="num">Modeled</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const expanded = open === g.hash
              return (
                <GroupBlock
                  key={g.family}
                  group={g}
                  expanded={expanded}
                  school={school}
                  season={season}
                  includeAlumni={includeAlumni}
                  history={history}
                  seasonYear={season}
                  open={open}
                  onToggle={onToggle}
                  openPlayer={openPlayer}
                />
              )
            })}
          </tbody>
        </table>
      </div>
      {playerRow && !openFamily ? (
        <div className="drill named-player-drill" id={`slice-${open}`}>
          <NilHistoryChart
            school={school}
            season={season}
            includeAlumni={includeAlumni}
            hash={open}
            label={playerRow.name}
            kind="player"
            points={playerRow.points}
            shareLabel={playerRow.name}
            onClose={() => onToggle(null)}
          />
        </div>
      ) : null}
      <p className="fine">
        {named.notes}
        {named.namesOnly
          ? ''
          : ` Player-mid sum ${money(named.sumMid)} of football slice ${money(named.cap)}${named.scale < 1 ? ` (scaled ×${named.scale.toFixed(2)} to stay inside the pot)` : ''}. Each player dollar is modeled: a share of the school pot from the desk rate card, not a contract, not On3 / Opendorse / NIL Go.`}
        {named.depthMatched
          ? ` ${named.depthMatched} names matched a ${named.wikiYear} Wikipedia two-deep.`
          : named.namesOnly
            ? ''
            : named.fullRoster
              ? ' No verified two-deep — starter, backup, and developmental seats follow listed roster order at each position.'
              : ' No verified two-deep for this school — every listed range is a position-band midpoint.'}
      </p>
      <p className="fine">
        Roster source:{' '}
        <a href={named.sourceUrl} target="_blank" rel="noreferrer">
          ESPN {season} football roster ↗
        </a>
        {named.wikiUrl && (
          <>
            {' '}
            · Depth:{' '}
            <a href={named.wikiUrl} target="_blank" rel="noreferrer">
              Wikipedia {named.wikiYear} team page ↗
            </a>
          </>
        )}
      </p>
    </section>
  )
}

function GroupBlock({ group, expanded, school, season, includeAlumni, history, seasonYear, onToggle, openPlayer }) {
  const series = history?.familySeries?.[group.family] || []
  const seasonPoint = series.find((p) => p.year === seasonYear) || null
  const openPlayerRow = openPlayer ? history?.playerSeries?.[openPlayer] : null
  const playerSeasonPoint = openPlayerRow?.points?.find((p) => p.year === seasonYear) || seasonPoint
  return (
    <>
      <tr>
        <td colSpan={4} className="pos-cell">
          <div
            className={`pos-row${expanded ? ' open' : ''}`}
            id={`slice-${group.hash}`}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            title={defTitle('rosterHistory')}
            onClick={() => onToggle(group.hash)}
            onKeyDown={onActivate(() => onToggle(group.hash))}
          >
            <span className="pos-lab">
              {group.label}
              <span className="fine-inline"> · {group.count}</span>
            </span>
            <span className="pos-hint">Year history</span>
            <span className={`pos-val${group.mid == null ? '' : ' modeled-cell'}`}>
              {group.mid == null ? '—' : moneyRange(group.low, group.high)}
            </span>
          </div>
          {expanded && group.mid != null ? (
            <AllocationFootnote
              className="nil-fn-dollar"
              point={seasonPoint}
              shareLabel={group.label}
              kind="position"
            />
          ) : null}
          {expanded ? (
            <div className="drill pos-drill">
              {series.length ? (
                <NilHistoryChart
                  school={school}
                  season={season}
                  includeAlumni={includeAlumni}
                  hash={group.hash}
                  label={`${familyLabel(group.family)} · ${school.name}`}
                  shareLabel={group.label}
                  kind="position"
                  points={series}
                  onClose={() => onToggle(null)}
                />
              ) : (
                <p className="lede tight">Loading year books…</p>
              )}
            </div>
          ) : null}
        </td>
      </tr>
      {group.players.map((p) => {
        const ph = playerHash(p.name)
        const playerOpen = openPlayer === ph.slice(7)
        return (
          <Fragment key={`${p.name}-${p.jersey}-${p.pos}`}>
            <tr className={playerOpen ? 'player-open' : undefined}>
              <td>
                <span
                  className="player-name"
                  role="button"
                  tabIndex={0}
                  aria-expanded={playerOpen}
                  onClick={() => onToggle(ph)}
                  onKeyDown={onActivate(() => onToggle(ph))}
                >
                  {p.name}
                </span>{' '}
                <i className={`dot ${p.confidence}`} title={p.note} />
              </td>
              <td>
                {p.pos || '—'}
                {p.bandShort ? <span className="fine-inline"> · {p.bandShort}</span> : null}
              </td>
              <td>{p.className || p.class || '—'}</td>
              <td className={`num${p.booked != null ? '' : ' modeled-cell'}`}>
                {p.low == null
                  ? '—'
                  : p.booked != null
                    ? `booked ${moneyRange(p.low, p.high)}`
                    : `modeled ${moneyRange(p.low, p.high)}`}
              </td>
            </tr>
            {playerOpen && p.low != null ? (
              <tr className="player-fn-row">
                <td colSpan={4}>
                  <AllocationFootnote
                    className="nil-fn-dollar"
                    point={playerSeasonPoint}
                    shareLabel={p.name}
                    kind="player"
                  />
                </td>
              </tr>
            ) : null}
          </Fragment>
        )
      })}
    </>
  )
}

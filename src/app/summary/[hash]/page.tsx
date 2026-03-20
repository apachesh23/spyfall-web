import { isValidAvatarId, DEFAULT_AVATAR_ID } from '@/lib/avatars';
import { supabase } from '@/lib/supabase/client';
import { GameModeCard } from '@/components/game/GameModeCard';
import { PlayerAvatar } from '@/components/player/PlayerAvatar';
import { PrimaryButtonLobby } from '@/components/ui/PrimaryButtonLobby';
import styles from './page.module.css';

type SearchParams = Promise<{ room?: string }>;

type HistoryPlayer = {
  id?: string;
  nickname: string;
  avatar_id?: number | null;
  is_spy?: boolean;
  role?: string | null;
  death_reason?: string | null;
};

type HistoryPayload = {
  players?: HistoryPlayer[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  spy_actions?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  voting_rounds?: any[];
  events?: Array<{
    at?: string;
    t?: number | null;
    type: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any;
  }>;
};

export default async function SummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ hash: string }>;
  searchParams: SearchParams;
}) {
  const { hash } = await params;
  const { room: roomCode } = await searchParams;

  const { data, error } = await supabase
    .from('game_history')
    .select('*')
    .eq('share_hash', hash)
    .single();

  if (error || !data) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerTexts}>
            <h1 className={`${styles.title} ${styles.titleFailure}`}>Итоги игры</h1>
            <p className={styles.subtitle}>Запись не найдена или хэш неверный</p>
          </div>
          {roomCode && (
            <PrimaryButtonLobby
              noIcon
              className={styles.backButton}
            >
              Вернуться в лобби
            </PrimaryButtonLobby>
          )}
        </div>
        {roomCode && (
          <div className={styles.footer}>
            <div className={`glass ${styles.historyBlock}`}>
              <p className={styles.historyTitle}>ХОД ИГРЫ</p>
              <p className={styles.historyText}>Детальная хронология будет недоступна для этой записи.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const payload = (data.payload as HistoryPayload) ?? {};
  const players = payload.players ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (payload.events ?? []) as Array<{ at?: string; t?: number | null; type: string; data?: any }>;

  const isCiviliansWin = data.winner === 'civilians';
  const isSpiesWin = data.winner === 'spies';

  const title = isCiviliansWin ? 'ОПЕРАЦИЯ ЗАВЕРШЕНА' : 'ОПЕРАЦИЯ ПРОВАЛЕНА';

  const spyGuessed =
    isSpiesWin &&
    events.some(
      (ev) => ev.type === 'spy_guess_result' && ev.data && ev.data.accepted === true,
    );

  let subtitle = '';
  if (isCiviliansWin) {
    subtitle = 'ВСЕ ШПИОНЫ УСТРАНЕНЫ';
  } else if (isSpiesWin && spyGuessed) {
    subtitle = 'ШПИОН УГАДАЛ ЛОКАЦИЮ';
  } else if (isSpiesWin) {
    subtitle = 'ШПИОН НЕ РАСКРЫТ';
  } else {
    subtitle = 'ИТОГИ ОПЕРАЦИИ';
  }

  const durationMinutes = (() => {
    const started = data.started_at ? new Date(data.started_at).getTime() : null;
    const ended = data.ended_at ? new Date(data.ended_at).getTime() : null;
    if (!started || !ended || ended <= started) return null;
    const totalSec = Math.round((ended - started) / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  })();

  const formatTime = (t?: number | null, at?: string) => {
    if (typeof t === 'number' && t >= 0) {
      const m = Math.floor(t / 60);
      const s = t % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    if (at) {
      const d = new Date(at);
      const m = d.getMinutes().toString().padStart(2, '0');
      const s = d.getSeconds().toString().padStart(2, '0');
      return `${m}:${s}`;
    }
    return '–:–';
  };

  const playerById = new Map<string, HistoryPlayer>();
  players.forEach((p) => {
    if (p.id) playerById.set(p.id, p);
  });

  type Stage = {
    key: string;
    t: number | null | undefined;
    at?: string;
    title: string;
    items: Array<{
      kind:
        | 'vote'
        | 'skip'
        | 'abstain'
        | 'eliminated'
        | 'final_civilians_lose'
        | 'tie_revote'
        | 'tie_failed'
        | 'no_elimination'
        | 'spy_guess'
        | 'spy_guess_result'
        | 'spy_kill'
        | 'text';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data?: any;
    }>;
    stageType: 'early_voting' | 'final_voting' | 'spy_guess' | 'spy_action' | 'generic';
  };

  const stages: Stage[] = [];

  const startStage = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ev: { t?: number | null; at?: string; type: string; data?: any },
    title: string,
    stageType: Stage['stageType'],
  ): Stage => {
    const prev = lastStage();
    if (prev && prev.stageType === stageType && (prev.t ?? null) === (ev.t ?? null)) {
      return prev;
    }
    const stage: Stage = {
      key: `${ev.type}_${stages.length}`,
      t: ev.t,
      at: ev.at,
      title,
      items: [],
      stageType,
    };
    stages.push(stage);
    return stage;
  };

  const lastStage = () => (stages.length > 0 ? stages[stages.length - 1] : null);

  // Группируем события в этапы
  events
    .slice()
    .sort((a, b) => (a.t ?? 0) - (b.t ?? 0))
    .forEach((ev) => {
      const d = ev.data ?? {};
      switch (ev.type) {
        case 'voting_started_early': {
          startStage(ev, 'Досрочное голосование', 'early_voting');
          break;
        }
        case 'voting_started_final': {
          startStage(ev, 'Финальное голосование', 'final_voting');
          break;
        }
        case 'vote_cast': {
          const stage = lastStage();
          if (!stage) break;
          const voter = d.voter_id ? playerById.get(String(d.voter_id)) : undefined;
          const suspect = d.suspect_id ? playerById.get(String(d.suspect_id)) : undefined;
          const voterName = voter?.nickname ?? 'Игрок';
          if (d.skip || (d.suspect_id && d.voter_id && d.suspect_id === d.voter_id)) {
            stage.items.push({
              kind: 'skip',
              data: { voterName, voterId: d.voter_id },
            });
          } else if (suspect) {
            stage.items.push({
              kind: 'vote',
              data: { voterName, suspectName: suspect.nickname, voterId: d.voter_id, suspectId: d.suspect_id },
            });
          } else {
            stage.items.push({
              kind: 'vote',
              data: { voterName, suspectName: null, voterId: d.voter_id, suspectId: null },
            });
          }
          break;
        }
        case 'vote_result': {
          const stage = lastStage();
          const abstainedIds = (d.abstained_ids ?? []) as string[];
          const pushAbstained = (s: Stage) => {
            abstainedIds.forEach((id) => {
              const p = playerById.get(String(id));
              s.items.push({
                kind: 'abstain',
                data: { playerName: p?.nickname ?? 'Игрок', playerId: id },
              });
            });
          };
          if (!stage) {
            // если этапа ещё нет (напрямую финальное голосование) — создаём общий
            const title = d.is_final_voting ? 'Итоги финального голосования' : 'Итоги голосования';
            const s = startStage(ev, title, d.is_final_voting ? 'final_voting' : 'early_voting');
            pushAbstained(s);
            const res = d.result ?? {};
            if (res.type === 'eliminated' && res.eliminatedId) {
              const eliminated = playerById.get(String(res.eliminatedId));
              const name = eliminated?.nickname ?? 'Игрок';
              const isSpy = res.wasSpy === true;
              s.items.push({
                kind: 'eliminated',
                data: { name, isSpy },
              });
            } else if (res.type === 'final_civilians_lose') {
              s.items.push({ kind: 'final_civilians_lose' });
            } else if (res.type === 'tie_revote') {
              s.items.push({ kind: 'tie_revote' });
            } else if (res.type === 'tie_failed') {
              s.items.push({ kind: 'tie_failed' });
            } else if (res.type === 'no_elimination') {
              s.items.push({ kind: 'no_elimination' });
            } else {
              s.items.push({ kind: 'text', data: { text: 'Подведены итоги голосования' } });
            }
          } else {
            pushAbstained(stage);
            const res = d.result ?? {};
            if (res.type === 'eliminated' && res.eliminatedId) {
              const eliminated = playerById.get(String(res.eliminatedId));
              const name = eliminated?.nickname ?? 'Игрок';
              const isSpy = res.wasSpy === true;
              stage.items.push({
                kind: 'eliminated',
                data: { name, isSpy },
              });
            } else if (res.type === 'final_civilians_lose') {
              stage.items.push({ kind: 'final_civilians_lose' });
            } else if (res.type === 'tie_revote') {
              stage.items.push({ kind: 'tie_revote' });
            } else if (res.type === 'tie_failed') {
              stage.items.push({ kind: 'tie_failed' });
            } else if (res.type === 'no_elimination') {
              stage.items.push({ kind: 'no_elimination' });
            } else {
              stage.items.push({ kind: 'text', data: { text: 'Подведены итоги голосования' } });
            }
          }
          break;
        }
        case 'spy_guess_started': {
          const stage = startStage(ev, 'Шпион пытается угадать локацию', 'spy_guess');
          const spy = d.player_id ? playerById.get(String(d.player_id)) : undefined;
          const spyName = spy?.nickname ?? 'Шпион';
          if (d.guess_text) {
            stage.items.push({
              kind: 'spy_guess',
              data: { spyName, guessText: String(d.guess_text) },
            });
          }
          break;
        }
        case 'spy_guess_result': {
          const stage = lastStage();
          if (!stage) break;
          stage.items.push({
            kind: 'spy_guess_result',
            data: { accepted: !!d.accepted, auto_win: !!d.auto_win },
          });
          break;
        }
        case 'spy_kill': {
          const stage = startStage(ev, 'Действие шпиона', 'spy_action');
          const spy = d.spy_id ? playerById.get(String(d.spy_id)) : undefined;
          const target = d.target_id ? playerById.get(String(d.target_id)) : undefined;
          const spyName = spy?.nickname ?? 'Шпион';
          const targetName = target?.nickname ?? 'игрока';
          stage.items.push({
            kind: 'spy_kill',
            data: { spyName, targetName },
          });
          break;
        }
        default:
          break;
      }
    });

  return (
    <div className={styles.wrap}>
        <div className={styles.header}>
          <div className={styles.headerTexts}>
            <h1 className={`${styles.title} ${isCiviliansWin ? styles.titleSuccess : styles.titleFailure}`}>
              {title}
            </h1>
            <p className={`${styles.subtitle} ${isCiviliansWin ? styles.subtitleSuccess : styles.subtitleFailure}`}>
              {subtitle}
            </p>
          </div>
        </div>

      <div className={styles.grid}>
        <div className={styles.leftCol}>
          <div className={`glass ${styles.statCard}`}>
            <p className={styles.statLabel}>ВРЕМЯ ОПЕРАЦИИ</p>
            <p className={styles.statValue}>{durationMinutes ?? '—'}</p>
          </div>

          <div className={styles.cardsCol}>
            <GameModeCard
              variant="location"
              value={data.location_name ?? '—'}
            />
            <GameModeCard
              variant="theme"
              value={data.theme ?? '—'}
            />
          </div>

          {roomCode && (
            <PrimaryButtonLobby
              href={`/room/${roomCode}`}
              variant="summary"
              noIcon
              className={styles.backButton}
              soundClick="click"
              soundHover="hover"
            >
              Вернуться в лобби
            </PrimaryButtonLobby>
          )}
        </div>

        <div className={styles.rightCol}>
          <div className={`glass ${styles.tableCard}`}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.theadRow}>
                    <th className={styles.td} />
                    <th className={styles.td}>ИМЯ АГЕНТА</th>
                    <th className={styles.td}>РОЛЬ</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isSpy = !!p.is_spy;
                    const rowClass = styles.tbodyRow;
                    const displayRole = p.role ?? '—';
                    const avatarId =
                      p.avatar_id != null && isValidAvatarId(p.avatar_id)
                        ? p.avatar_id
                        : DEFAULT_AVATAR_ID;

                    return (
                      <tr key={idx} className={rowClass}>
                        <td className={`${styles.td} ${styles.avatarCell}`}>
                          <div className={styles.avatarWrap}>
                            <PlayerAvatar avatarId={avatarId} size="sm" />
                          </div>
                        </td>
                        <td className={`${styles.td} ${styles.agentName}`}>
                          {isSpy ? (
                            <span className={styles.spyName}>{p.nickname}</span>
                          ) : (
                            p.nickname
                          )}
                        </td>
                        <td className={`${styles.td} ${styles.roleCell}`}>
                          {isSpy ? (
                            <span className={styles.spyRole}>Шпион</span>
                          ) : (
                            displayRole
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={`glass ${styles.historyBlock}`}>
          <p className={styles.historyTitle}>ХОД ИГРЫ</p>
          {stages.length === 0 ? (
            <p className={styles.historyText}>
              Здесь появится детальная хронология раундов, голосований и действий шпиона.
            </p>
          ) : (
            <ul className={styles.historyList}>
              {stages.map((stage, idx) => (
                <li key={stage.key ?? idx} className={styles.historyItem}>
                  <div>
                    <span className={styles.historyTime}>
                      {formatTime(stage.t ?? null, stage.at)} —
                    </span>
                    <span
                      className={`${styles.historyTitleText} ${
                        stage.stageType === 'early_voting'
                          ? styles.historyTitleEarly
                          : stage.stageType === 'final_voting'
                            ? styles.historyTitleFinal
                            : stage.stageType === 'spy_guess' || stage.stageType === 'spy_action'
                              ? styles.historyTitleSpy
                              : ''
                      }`}
                    >
                      {stage.title}
                    </span>
                  </div>
                  {stage.items.length > 0 && (
                    <ul className={styles.historySubList}>
                        {stage.items.map((item, i) => {
                          if (item.kind === 'vote') {
                            const { voterName, suspectName, voterId, suspectId } = item.data || {};
                            const voterPlayer = voterId ? playerById.get(String(voterId)) : undefined;
                            const suspectPlayer = suspectId ? playerById.get(String(suspectId)) : undefined;
                            const voterIsSpy = !!voterPlayer?.is_spy;
                            const suspectIsSpy = !!suspectPlayer?.is_spy;
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={voterIsSpy ? styles.historySpyName : styles.historyPlayerName}>
                                  {voterName}
                                </span>{' '}
                                <span className={styles.historyMeta}>
                                  голосует
                                  {suspectName ? ' за ' : ''}
                                </span>
                                {suspectName && (
                                  <span className={suspectIsSpy ? styles.historySpyName : styles.historyPlayerName}>
                                    {suspectName}
                                  </span>
                                )}
                              </li>
                            );
                          }
                          if (item.kind === 'skip') {
                            const { voterName, voterId } = item.data || {};
                            const voterPlayer = voterId ? playerById.get(String(voterId)) : undefined;
                            const voterIsSpy = !!voterPlayer?.is_spy;
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={voterIsSpy ? styles.historySpyName : styles.historyPlayerName}>
                                  {voterName}
                                </span>{' '}
                                <span className={styles.historyMeta}>пропускает голос</span>
                              </li>
                            );
                          }
                          if (item.kind === 'abstain') {
                            const { playerName, playerId } = item.data || {};
                            const abstainPlayer = playerId ? playerById.get(String(playerId)) : undefined;
                            const isSpy = !!abstainPlayer?.is_spy;
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={isSpy ? styles.historySpyName : styles.historyPlayerName}>
                                  {playerName}
                                </span>{' '}
                                <span className={styles.historyMeta}>воздержался от голосования</span>
                              </li>
                            );
                          }
                          if (item.kind === 'eliminated') {
                            const { name, isSpy } = item.data || {};
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historyMeta}>Игроки выгнали </span>
                                <span
                                  className={
                                    isSpy
                                      ? styles.historySpyName
                                      : styles.historyPlayerName
                                  }
                                >
                                  {name}
                                </span>
                                <span className={styles.historyMeta}>
                                  {` который был ${isSpy ? 'шпионом' : 'мирным агентом'}`}
                                </span>
                              </li>
                            );
                          }
                          if (item.kind === 'final_civilians_lose') {
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historyMeta}>
                                  Мирные агенты не нашли{' '}
                                </span>
                                <span className={styles.historySpyName}>шпиона</span>
                                <span className={styles.historyMeta}> и проиграли</span>
                              </li>
                            );
                          }
                          if (item.kind === 'tie_revote') {
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historyMeta}>
                                  Ничья — назначено повторное голосование
                                </span>
                              </li>
                            );
                          }
                          if (item.kind === 'tie_failed') {
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historyMeta}>
                                  Повторное голосование не выявило победителя
                                </span>
                              </li>
                            );
                          }
                          if (item.kind === 'no_elimination') {
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historyMeta}>
                                  Голосование не состоялось, никто не был изгнан
                                </span>
                              </li>
                            );
                          }
                          if (item.kind === 'spy_guess') {
                            const { spyName, guessText } = item.data || {};
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historySpyName}>{spyName}</span>{' '}
                                <span className={styles.historyMeta}>думает, что это </span>
                                <span className={styles.historyLocation}>
                                  «{guessText}»
                                </span>
                              </li>
                            );
                          }
                          if (item.kind === 'spy_guess_result') {
                            const { accepted, auto_win } = item.data || {};
                            return (
                              <li key={i} className={styles.historySubItem}>
                                {accepted && auto_win ? (
                                  <span className={styles.historyMeta}>
                                    Засчитано автоматически —{' '}
                                    <span className={styles.historySpyName}>шпион побеждает</span>
                                  </span>
                                ) : (
                                  <>
                                    <span className={styles.historyMeta}>
                                      Попытка {accepted ? 'удачная' : 'неудачная'}
                                      {accepted ? ' — ' : ' — игра продолжается'}
                                    </span>
                                    {accepted && (
                                      <span className={styles.historySpyName}>
                                        {' '}
                                        шпион побеждает
                                      </span>
                                    )}
                                  </>
                                )}
                              </li>
                            );
                          }
                          if (item.kind === 'spy_kill') {
                            const { spyName, targetName } = item.data || {};
                            return (
                              <li key={i} className={styles.historySubItem}>
                                <span className={styles.historySpyName}>{spyName}</span>{' '}
                                <span className={styles.historyMeta}>устраняет </span>
                                <span className={styles.historyPlayerName}>{targetName}</span>
                              </li>
                            );
                          }
                          // text / fallback
                          const text = item.data?.text ?? '';
                          return (
                            <li key={i} className={styles.historySubItem}>
                              <span className={styles.historyMeta}>{text}</span>
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

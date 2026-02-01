// /lib/avatars.ts
// Конфигурация всех аватаров для игры
// GPT: НЕ ТРОГАТЬ этот файл!

export type AvatarId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16;

export type AgentAvatar = {
  id: AvatarId;
  name: string;
  image: string;          // /avatars/agent_01.webp
  mask?: string;          // /avatars/agent_01_mask.webp (опционально)
  maskFit?: 'width' | 'height';
  description?: string;   // Для tooltip/accessibility
};

// Полная конфигурация всех 16 аватаров
export const AVATARS: Record<AvatarId, AgentAvatar> = {
  1: {
    id: 1,
    name: 'Старый Волк',
    image: '/avatars/agent_01.webp',
    description: 'Видел всё, кроме спокойной пенсии. Его глаз под повязкой наверняка смотрит в душу.',
  },
  2: {
    id: 2,
    name: 'Секретный агент на каблуках',
    image: '/avatars/agent_02.webp',
    description: 'Может за пять секунд переубедить врага… или разорить его на туфли.',
  },
  3: {
    id: 3,
    name: 'Шутник-Сыщик',
    image: '/avatars/agent_03.webp',
    description: 'Разгадывает преступления быстрее, чем шутит. Но иногда наоборот.',
  },
  4: {
    id: 4,
    name: 'Девчонка с переулка',
    image: '/avatars/agent_04.webp',
    description: 'Она знает все сплетни города. И ваши тоже.',
  },
  5: {
    id: 5,
    name: 'Британец-аналитик',
    image: '/avatars/agent_05.webp',
    description: 'Может вычислить убийцу по складке на носке. Но только в пятницу после чая.',
  },
  6: {
    id: 6,
    name: 'Шпионка-инфлюенсер',
    image: '/avatars/agent_06.webp',
    mask: '/avatars/agent_06_mask.webp',
    maskFit: 'height',
    description: 'Лайки — её прикрытие, сторис — её оружие.',
  },
  7: {
    id: 7,
    name: 'Параноик',
    image: '/avatars/agent_07.webp',
    description: 'Доверяет только себе. И то не всегда.',
  },
  8: {
    id: 8,
    name: 'Слишком деловая',
    image: '/avatars/agent_08.webp',
    description: 'Если вы ей мешаете, она вас просто вычеркнет… из всего.',
  },
  9: {
    id: 9,
    name: 'Молодой гик-шпион',
    image: '/avatars/agent_09.webp',
    description: 'Хакнул банкомат ради доступа в библиотеку. И гордится этим.',
  },
  10: {
    id: 10,
    name: 'Пенсионерка в деле',
    image: '/avatars/agent_10.webp',
    mask: '/avatars/agent_10_mask.webp',
    maskFit: 'height',
    description: 'Вяжет, печёт пироги и ломает замки быстрее, чем внуки решают кроссворд.',
  },
  11: {
    id: 11,
    name: 'Американский ковбой-детектив',
    image: '/avatars/agent_11.webp',
    mask: '/avatars/agent_11_mask.webp',
    maskFit: 'width',
    description: 'Вышел из салуна, зашёл в отдел полиции. Разницы не заметил.',
  },
  12: {
    id: 12,
    name: 'Фатальная свидетельница',
    image: '/avatars/agent_12.webp',
    mask: '/avatars/agent_12_mask.webp',
    maskFit: 'height',
    description: 'Её истории можно слушать вечно. Но лучше не спрашивать, откуда она всё знает.',
  },
  13: {
    id: 13,
    name: 'Опер из 80-х',
    image: '/avatars/agent_13.webp',
    mask: '/avatars/agent_13_mask.webp',
    maskFit: 'height',
    description: 'Для него Интернет — это “тот парень из третьего отдела”.',
  },
  14: {
    id: 14,
    name: 'Шпион в стиле Джеймса Бонда',
    image: '/avatars/agent_14.webp',
    description: 'Никогда не проливает мартини. Даже когда ест мороженое на задании.',
  },
  15: {
    id: 15,
    name: 'Реквизитор из архива',
    image: '/avatars/agent_15.webp',
    description: 'Находит документы даже там, где их никогда не было. И кофе тоже.',
  },
  16: {
    id: 16,
    name: 'Грубиян с сердцем',
    image: '/avatars/agent_16.webp',
    mask: '/avatars/agent_16_mask.webp',
    maskFit: 'height',
    description: 'Выглядит как бульдозер, но внутри — плюшевый мишка. Буквально.',
  },
};

// Массив для карусели (упорядоченный)
export const AVATAR_LIST: AgentAvatar[] = Object.values(AVATARS);

// Утилиты
export function getAvatar(id: AvatarId): AgentAvatar {
  return AVATARS[id];
}

export function getAvatarImage(id: AvatarId): string {
  return AVATARS[id].image;
}

export function isValidAvatarId(id: number): id is AvatarId {
  return id >= 1 && id <= 16;
}

// Default avatar если что-то пошло не так
export const DEFAULT_AVATAR_ID: AvatarId = 1;
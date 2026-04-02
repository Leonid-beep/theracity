export const PETERSBURG_METRO_STATIONS = [
  "Автово",
  "Адмиралтейская",
  "Академическая",
  "Балтийская",
  "Беговая",
  "Бухарестская",
  "Василеостровская",
  "Владимирская",
  "Волковская",
  "Выборгская",
  "Горный институт",
  "Горьковская",
  "Гостиный двор",
  "Гражданский проспект",
  "Девяткино",
  "Достоевская",
  "Дунайская",
  "Елизаровская",
  "Звёздная",
  "Звенигородская",
  "Зенит",
  "Кировский завод",
  "Комендантский проспект",
  "Крестовский остров",
  "Купчино",
  "Ладожская",
  "Ленинский проспект",
  "Лесная",
  "Лиговский проспект",
  "Ломоносовская",
  "Маяковская",
  "Международная",
  "Московская",
  "Московские ворота",
  "Нарвская",
  "Невский проспект",
  "Новочеркасская",
  "Обводный канал",
  "Обухово",
  "Озерки",
  "Парк Победы",
  "Парнас",
  "Петроградская",
  "Пионерская",
  "Площадь Александра Невского-I",
  "Площадь Александра Невского-II",
  "Площадь Восстания",
  "Площадь Ленина",
  "Площадь Мужества",
  "Политехническая",
  "Приморская",
  "Пролетарская",
  "Проспект Большевиков",
  "Проспект Ветеранов",
  "Проспект Просвещения",
  "Проспект Славы",
  "Пушкинская",
  "Путиловская",
  "Рыбацкое",
  "Садовая",
  "Сенная площадь",
  "Спасская",
  "Спортивная",
  "Старая Деревня",
  "Технологический институт",
  "Удельная",
  "Улица Дыбенко",
  "Фрунзенская",
  "Чёрная речка",
  "Чернышевская",
  "Чкаловская",
  "Шушары",
  "Электросила",
  "Юго-Западная",
];

export const DEFAULT_SPACE_TYPES = ["Брандмауэры", "Дворы", "Улицы"];

export const DEFAULT_MOODS = [
  "Надежда",
  "Радость",
  "Спокойствие",
  "Тоска",
  "Тревога",
  "Уют",
  "Одиночество",
  "Ностальгия",
  "Напряжение",
  "Пустота",
];

export const DEFAULT_ATMOSPHERES = [
  "Дождь",
  "Пасмурно",
  "Снег",
  "Солнечно",
  "Туман",
  "Утро",
  "День",
  "Вечер",
  "Ночь",
];

export function sortRuStrings(values: string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "ru"));
}

export function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function mergeOptionLists(...lists: string[][]): string[] {
  return sortRuStrings(uniqueStrings(lists.flat()));
}

export function parseStoredMultiValue(value: string | null | undefined): string[] {
  if (!value) return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return uniqueStrings(parsed.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      return [trimmed];
    }
  }

  return [trimmed];
}

export function serializeMultiValue(values: string[]): string {
  return JSON.stringify(uniqueStrings(values));
}

export function formatMultiValue(value: string[] | string | null | undefined): string {
  const parsed = Array.isArray(value) ? uniqueStrings(value) : parseStoredMultiValue(value);
  return parsed.join(", ");
}

export function matchesSelectedValues(
  storedValue: string | null | undefined,
  selectedValues: string[],
): boolean {
  if (!selectedValues.length) return true;
  const parsed = parseStoredMultiValue(storedValue);
  return parsed.some((value) => selectedValues.includes(value));
}

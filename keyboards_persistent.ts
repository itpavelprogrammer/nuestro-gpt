import { Keyboard } from "grammy";

/**
 * Постоянная нижняя клавиатура с кнопкой «☰ Меню»,
 * которая всегда доступна в любой момент диалога.
 */
export const MENU_BUTTON_TEXT = "☰ Меню";

export const persistentKeyboard = new Keyboard()
  .text(MENU_BUTTON_TEXT)
  .resized()
  .persistent();

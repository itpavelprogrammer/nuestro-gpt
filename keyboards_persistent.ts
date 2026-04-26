import { Keyboard } from "grammy";

export const MENU_BUTTON_TEXT = "☰ Меню";

// Постоянная клавиатура с кнопкой меню — всегда видна снизу
export const persistentKeyboard = new Keyboard()
  .text(MENU_BUTTON_TEXT)
  .resized()
  .persistent();

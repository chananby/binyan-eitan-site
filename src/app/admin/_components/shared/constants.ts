// Default-style classes shared across the admin forms. INPUT defines
// the text-input look (border + padding + focus state) used by every
// <input> / <select> / <textarea> in the admin tabs.
//
// Bumped from text-sm (14px) to text-content (15px) — the
// readability floor. Form values are content; users read them as
// they fill the form. text-charcoal makes sure the entered value
// stays at full contrast against the bone background.
export const INPUT = "w-full border border-charcoal/15 bg-bone px-3 py-2.5 text-content text-charcoal focus:border-accent focus:outline-none transition-colors";

export const WEATHER_OPTIONS = ["☀️ בהיר", "⛅ מעונן חלקית", "☁️ מעונן", "🌧️ גשום", "🌩️ סוערת", "🌬️ רוחות חזקות"];

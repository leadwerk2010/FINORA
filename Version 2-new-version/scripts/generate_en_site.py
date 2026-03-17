from __future__ import annotations

import re
from pathlib import Path

from bs4 import BeautifulSoup, Comment, Doctype, NavigableString
from deep_translator import GoogleTranslator


ROOT = Path(__file__).resolve().parents[1]
EN_DIR = ROOT / "en"
PAGE_FILES = [
    "index.html",
    "finora-philosophie.html",
    "ueber-finora.html",
    "kontakt.html",
    "altersvorsorge.html",
    "investment-beratung.html",
    "immobilien-beratung.html",
    "erbanlage-beratung.html",
    "impressum.html",
    "datenschutz.html",
]

SKIP_TAGS = {
    "script",
    "style",
    "svg",
    "path",
    "circle",
    "source",
}

SKIP_CLASSES = {
    "badge-dot",
    "blurb-icon",
    "contact-icon",
    "header-lang-icon",
    "kontakt-info-icon",
    "step-icon",
    "timeline-item__icon",
    "timeline-item__number",
    "timeline-card__toggle-arrow",
}

GLOSSARY = {
    "Adresse": "Address",
    "Altersvorsorge-": "Retirement Planning",
    "Altersvorsorge": "Retirement Planning",
    "Altersvorsorge-Beratung": "Retirement Planning Advisory",
    "Anfrage per E-Mail oder Telefon": "Enquiries by email or telephone",
    "Anfrageformular": "enquiry form",
    "Beratung anfragen": "Request advice",
    "Datenschutz": "Privacy Policy",
    "Datenschutzerklärung": "Privacy Policy",
    "Den ersten Schritt machen": "Take the first step",
    "Deutsch": "Deutsch",
    "Die Lösung": "The solution",
    "E-Mail": "Email",
    "English": "English",
    "Erb-Anlage": "Inheritance Investment",
    "Erb-Anlage-": "Inheritance Investment",
    "Erb-Anlage-Beratung": "Inheritance Investment Advisory",
    "Erbanlage-Beratung": "Inheritance Investment Advisory",
    "Ergebnis": "Outcome",
    "Finora-Philosophie": "Finora Philosophy",
    "Fragen zu Finanzen? Hier gibt's Klartext.": "Questions about money? Here are straight answers.",
    "Fragen zu Finanzen? Hier gibt’s Klartext.": "Questions about money? Here are straight answers.",
    "Impressum": "Legal Notice",
    "Immobilien-": "Real Estate",
    "Immobilien": "Real Estate",
    "Immobilien-Beratung": "Real Estate Advisory",
    "Investment-": "Investment",
    "Investment": "Investment",
    "Investment-Beratung": "Investment Advisory",
    "Beratung": "Advisory",
    "Kontakt": "Contact",
    "Kostenloses Erstgespräch vereinbaren": "Book a free initial consultation",
    "Leistungen": "Services",
    "Mehr erfahren": "Learn more",
    "Mehr lesen": "Read more",
    "Menü": "Menu",
    "Nachricht senden": "Send message",
    "Name": "Name",
    "Schreib uns": "Write to us",
    "So funktioniert’s": "How it works",
    "So funktioniert's": "How it works",
    "Spoiler": "Spoiler",
    "Startseite": "Home",
    "Strategie kennenlernen": "Explore the strategy",
    "Themen": "Topics",
    "Telefon": "Phone",
    "Über Finora": "About Finora",
    "Warum Strategie beim Investieren den Unterschied macht": "Why strategy makes the difference when investing",
    "Warum wir uns gemeinsam auf die Suche nach einem passenden Objekt machten, analysierten wir Adrians Gesamtsituation:": "Before we started looking for a suitable property together, we analysed Adrian's overall situation:",
    "Weniger": "Less",
}

POST_REPLACEMENTS = [
    ("non-binding", "no obligation"),
    ("Retirement provision", "Retirement Planning"),
    ("retirement provision", "retirement planning"),
    ("pension provision", "retirement planning"),
    ("private provision", "private retirement planning"),
    ("Property-", "Real Estate "),
    ("Property advice", "Real Estate Advisory"),
    ("Property Advisory", "Real Estate Advisory"),
    ("Hereditary", "Inheritance Investment"),
    ("Genetic advice", "Inheritance Investment Advisory"),
    ("<strong>Investment<br/></strong>Advice", "<strong>Investment<br/></strong>Advisory"),
    ("</strong><br/>Advice", "</strong><br/>Advisory"),
    (
        "An understandable strategy for wealth creation, provision and taxes, tailored to your goals, your risk and your everyday life.",
        "A clear strategy for wealth building, long-term planning and taxes, tailored to your goals, your risk profile and your day-to-day life.",
    ),
    (
        "What does retirement planning actually mean? <strong>for you?</strong>",
        "What does retirement planning actually <strong>mean for you?</strong>",
    ),
    (
        "Retirement Planning is more than just a &ldquo;pension&rdquo;. It's about financial independence: being able to make decisions for yourself, your family and your lifestyle. With a concept that is understandable, fits your plans and works even when your life changes.",
        "Retirement planning is more than just a pension. It is about financial independence: being able to make decisions for yourself, your family and your lifestyle with a concept that is easy to understand, fits your plans and still works when life changes.",
    ),
    (
        "Why <strong>private retirement planning is essential</strong> is",
        "Why <strong>private retirement planning is essential</strong>",
    ),
    (
        "The statutory pension only offers basic benefits, which will hardly be enough to cover your own needs\n                        maintain living standards. Without your own provisions, your standard of living will drop significantly in old age\n                        individual pension gap.",
        "The statutory pension usually provides a basic level of cover, but for most people it will not be enough to maintain their current standard of living. Without your own additional provision, a noticeable pension gap remains in retirement.",
    ),
    ("Plan precautions", "Plan your retirement"),
    (
        "Inheritance Investment advice | Finora Investment Studio",
        "Inheritance Investment Advisory | Finora Investment Studio",
    ),
    (
        "Investment advice | Finora Investment Studio",
        "Investment Advisory | Finora Investment Studio",
    ),
    (
        'I have the <a href="datenschutz.html">Privacy Policy</a> read\n                                    and I agree.',
        'I have read the <a href="datenschutz.html">Privacy Policy</a>\n                                    and agree to it.',
    ),
    (
        "Let's talk, no obligation and personal. Finora gives you clarity about your financial situation without the pressure to sell.",
        "Let's talk with no obligation and on a personal level. Finora gives you clarity about your financial situation without sales pressure.",
    ),
]

translator = GoogleTranslator(source="de", target="en")
translation_cache: dict[str, str] = {}


def is_external(url: str) -> bool:
    return url.startswith(("http://", "https://", "//", "mailto:", "tel:", "#", "data:", "javascript:"))


def de_public_url(filename: str) -> str:
    return f"/{filename}"


def en_public_url(filename: str) -> str:
    return f"/en/{filename}"


def add_doctype(html: str) -> str:
    if html.lstrip().lower().startswith("<!doctype"):
        return html
    return "<!DOCTYPE html>\n" + html


def should_skip_text(node: NavigableString) -> bool:
    if isinstance(node, Comment):
        return True

    parent = node.parent
    if parent is None or parent.name in SKIP_TAGS:
        return True

    for ancestor in [parent, *parent.parents]:
        if getattr(ancestor, "attrs", None):
            if ancestor.get("aria-hidden") == "true":
                return True
            classes = set(ancestor.get("class", []))
            if classes & SKIP_CLASSES:
                return True

    text = str(node)
    stripped = text.strip()
    if not stripped:
        return True
    if re.fullmatch(r"[\d\s%+./,:;|()\-–—&]+", stripped):
        return True
    if len(stripped) <= 2 and stripped.upper() == stripped:
        return True
    if "@" in stripped or stripped.startswith("http"):
        return True
    return False


def translate_string(text: str) -> str:
    if text in GLOSSARY:
        return GLOSSARY[text]

    if text in translation_cache:
        return translation_cache[text]

    try:
        translated = translator.translate(text)
    except Exception:
        translated = text

    if text.istitle() and translated and translated[0].islower():
        translated = translated[0].upper() + translated[1:]

    translation_cache[text] = translated
    return translated


def preserve_whitespace(text: str, translated: str) -> str:
    match = re.match(r"^(\s*)(.*?)(\s*)$", text, re.S)
    if not match:
        return translated
    return f"{match.group(1)}{translated}{match.group(3)}"


def translate_text_nodes(soup: BeautifulSoup) -> None:
    for node in list(soup.find_all(string=True)):
        if should_skip_text(node):
            continue
        source = str(node)
        translated = translate_string(source.strip())
        node.replace_with(preserve_whitespace(source, translated))


def translate_attributes(soup: BeautifulSoup) -> None:
    for tag in soup.find_all(True):
        for attr in ("alt", "aria-label", "title", "placeholder", "data-title", "data-body"):
            value = tag.get(attr)
            if not value or not re.search(r"[A-Za-zÄÖÜäöüß]", value):
                continue
            if attr == "aria-label" and value in {"DE", "EN"}:
                continue
            tag[attr] = translate_string(value.strip())

    description = soup.find("meta", attrs={"name": "description"})
    if description and description.get("content"):
        description["content"] = translate_string(description["content"])


def update_resource_paths(soup: BeautifulSoup, locale: str) -> None:
    if locale != "en":
        return

    for tag in soup.find_all(True):
        for attr, value in list(tag.attrs.items()):
            if not isinstance(value, str):
                continue
            if not value or is_external(value) or value.startswith("../"):
                continue
            if value.startswith(("css/", "js/", "assets/", "favicon", "apple-touch-icon")):
                tag[attr] = f"../{value}"

        style = tag.get("style")
        if style and "assets/" in style:
            tag["style"] = re.sub(
                r"url\((['\"]?)(assets/)",
                r"url(\1../assets/",
                style,
            )


def ensure_head_locale(soup: BeautifulSoup, filename: str, locale: str) -> None:
    soup.html["lang"] = locale
    head = soup.head
    if head is None:
        return

    for link in list(head.find_all("link", attrs={"rel": ["canonical"]})):
        link.decompose()
    for link in list(head.find_all("link", attrs={"rel": ["alternate"]})):
        if link.get("hreflang") in {"de", "en"}:
            link.decompose()

    canonical_href = en_public_url(filename) if locale == "en" else de_public_url(filename)
    description = head.find("meta", attrs={"name": "description"})

    canonical = soup.new_tag("link", rel="canonical", href=canonical_href)
    de_alt = soup.new_tag("link", rel="alternate", hreflang="de", href=de_public_url(filename))
    en_alt = soup.new_tag("link", rel="alternate", hreflang="en", href=en_public_url(filename))

    insert_after = description or head.find("title")
    if insert_after is None:
        head.append(canonical)
        head.append(de_alt)
        head.append(en_alt)
    else:
        insert_after.insert_after(en_alt)
        en_alt.insert_before(de_alt)
        de_alt.insert_before(canonical)


def configure_language_switcher(soup: BeautifulSoup, filename: str, locale: str) -> None:
    header_lang = soup.select_one(".header-lang")
    lang_btn = soup.select_one(".header-lang-btn")
    lang_label = soup.select_one(".header-lang-label")
    dropdown = soup.select_one(".header-lang-dropdown")
    if not header_lang or not lang_btn or not lang_label or not dropdown:
        return

    de_link = dropdown.find("a", attrs={"lang": "de"})
    en_link = dropdown.find("a", attrs={"lang": "en"})
    if not de_link or not en_link:
        options = dropdown.find_all("a")
        if len(options) >= 2:
            de_link, en_link = options[0], options[1]
        else:
            return

    if locale == "en":
        header_lang["aria-label"] = "Choose language"
        lang_btn["aria-label"] = "Change language"
        lang_btn["title"] = "Change language"
        lang_label.string = "EN"
        de_link["href"] = f"../{filename}"
        en_link["href"] = filename
        de_link["class"] = ["header-lang-option"]
        en_link["class"] = ["header-lang-option", "is-active"]
        de_link["hreflang"] = "de"
        en_link["hreflang"] = "en"
        de_link["lang"] = "de"
        en_link["lang"] = "en"
        de_link.string = "Deutsch"
        en_link.string = "English"
    else:
        header_lang["aria-label"] = "Sprache wählen"
        lang_btn["aria-label"] = "Sprache wechseln"
        lang_btn["title"] = "Sprache wechseln"
        lang_label.string = "DE"
        de_link["href"] = filename
        en_link["href"] = f"en/{filename}"
        de_link["class"] = ["header-lang-option", "is-active"]
        en_link["class"] = ["header-lang-option"]
        de_link["hreflang"] = "de"
        en_link["hreflang"] = "en"
        de_link["lang"] = "de"
        en_link["lang"] = "en"
        de_link.string = "Deutsch"
        en_link.string = "English"


def configure_mobile_menu_locale(soup: BeautifulSoup, filename: str, locale: str) -> None:
    menu = soup.select_one(".mobile-menu")
    if not menu:
        return

    existing = menu.select_one(".mobile-menu-locale")
    if existing:
        existing.decompose()

    link = soup.new_tag("a")
    link["class"] = ["mobile-menu-locale"]
    if locale == "en":
        link["href"] = f"../{filename}"
        link.string = "DE"
    else:
        link["href"] = f"en/{filename}"
        link.string = "EN"
    menu.append(link)


def configure_mobile_toggle(soup: BeautifulSoup, locale: str) -> None:
    toggle = soup.select_one(".mobile-menu-toggle")
    if toggle:
        toggle["aria-label"] = "Open menu" if locale == "en" else "Menü öffnen"


def translate_page(source_path: Path, locale: str) -> str:
    soup = BeautifulSoup(source_path.read_text(encoding="utf-8"), "html.parser")

    for child in list(soup.contents):
        if isinstance(child, Doctype):
            child.extract()

    if locale == "en":
        translate_text_nodes(soup)
        translate_attributes(soup)

    update_resource_paths(soup, locale)
    ensure_head_locale(soup, source_path.name, locale)
    configure_language_switcher(soup, source_path.name, locale)
    configure_mobile_menu_locale(soup, source_path.name, locale)
    configure_mobile_toggle(soup, locale)

    html = add_doctype(soup.decode(formatter="html"))
    if locale == "en":
        for source, target in POST_REPLACEMENTS:
            html = html.replace(source, target)
    return html


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def main() -> None:
    EN_DIR.mkdir(exist_ok=True)
    for filename in PAGE_FILES:
        source = ROOT / filename
        de_content = translate_page(source, "de")
        en_content = translate_page(source, "en")
        write_file(source, de_content)
        write_file(EN_DIR / filename, en_content)
        print(f"Generated {filename} and en/{filename}")


if __name__ == "__main__":
    main()

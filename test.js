const Knwl = require("knwl.js");

const knwlInstance = new Knwl("english");

const htmlContent = `
<body>
        <div class="text">random text random text Address: 4 Lyon Road, Hersham, Walton-on-Thames, KT12 3PU random text random text</div>
        <div class="text">random text random text 47 Newton Street, Manchester, M1 1FT random text random text</div>
        <div class="text">random text random text 20 Hilton St, Manchester M1 1FR random text random text</div>
        <div class="text">random text random text 25 West Street. Poole. Dorset. BH15 1LD random text random text</div>
</body>
`;

knwlInstance.init(htmlContent);

// Extract text (words) using Knwl.js as one string
const text = knwlInstance.words.get("words").join(" ");

// Custom UK phone number filtering function
function FindPhoneNumbers(text)
{
    const textContent = htmlContent.replace(/<[^>]*>/g, ' ');

    //const postcodeRegex = /(?<![A-Z\d])([A-Z]{1,2}\d{1,2}[A-Z]?) ?\d[A-Z]{2}(?![A-Z\d])/gi;
    const addressRegex = /(?<![\w\-])\d{1,4}[.\s\-]([\w\-]+[.\s\-]){1,2}(?:Acre|Alley|Approach|Arcade|Arch|Avenue|Bank|Boulevard|Bow|Bridge|Broadway|Brook|Brow|Bypass|Chase|Circus|Close|Court|Corner|Crescent|Cross|Croft|Dale|Dene|Drive|Drove|End|Field|Fold|Gardens|Gate|Ginnel|Grange|Green|Grove|Heights|Hill|Lane|Lea|Leasow|Leasowe|Market|Mead|Meadow|Mews|Mile|Mount|Nook|Parade|Pasture|Pass|Passage|Path|Park|Place|Plaza|Reach|Rise|Road|Row|Score|Side|Street|Square|Terrace|Twitten|Vale|Valley|View|Quay|Walk|Way|Yard|St|Rd|Ave|Ln|Dr|Cl|Cres|Ct|Sq|Pl|Ter|Wy)[,.\s\-]{0,3}(([\w\-]+[.\s\-]){1,3}[,.\s\-]{0,3}){1,3}?[A-Z]{1,2}\d{1,2}[A-Z]?[.\s\-]?\d[A-Z]{2}(?![\w\-])/gi;

    const addresses = textContent.match(addressRegex);

    console.log(addresses);
}

// Find UK phone numbers from the extracted words
const ukPhoneNumbers = FindPhoneNumbers(text);

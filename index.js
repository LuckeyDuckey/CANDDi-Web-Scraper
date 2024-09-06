const readline = require("readline");
const cheerio = require("cheerio");
const knwl = require("knwl.js");
const https = require("https");
const http = require("http");

class CompanyWebsiteScraper
{
    constructor()
    {
        this.Emails = new Set();
        this.PhoneNumbers = new Set();
        this.Addresses = new Set();
        this.ExploredPages = new Set();
        this.CompanyDomain = "";
    }

    Delay(Milliseconds)
    {
        return new Promise(Resolve => setTimeout(Resolve, Milliseconds));
    }

    async GetHTMLFromURL(URL)
    {
        const Protocol = URL.startsWith("https") ? https : http;

        const Options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        };

        return new Promise((Resolve, Reject) => {
            try
            {
                const Request = Protocol.get(URL, Options, (Response) => {
                    
                    // Check if content type is HTML
                    if (!Response.headers["content-type"].includes("text/html")) { return Resolve(null); }
    
                    let HTML = "";
                    
                    Response.on("data", (DataChunk) => { HTML += DataChunk; });
                    Response.on("end", () => Resolve(HTML));
                });

                // Handle error
                Request.on('error', (Error) => {
                    Reject(`Request error: ${Error.message}`);
                });
        
                // Handle connection timeout
                Request.setTimeout(30000, () => {
                    Request.destroy();
                    Reject("Request timed out.");
                });
            }

            catch (Error)
            {
                Reject(`Unexpected error: ${Error.message}`);
            }
        });
    }

    ExtractPhoneNumbers(HTML)
    {
        const PhoneRegex = /(?<!\d)(0|\+44|44)[\s\-()]*(\d[\s\-()]*){10}(?!\d)/g;
        const PhoneNumbers = HTML.match(PhoneRegex) || [];

        return PhoneNumbers.map((Number) => {

            const CleanNumber = Number.replace(/\D/g, "");
            const SpaceIndex = CleanNumber.length - 5;
    
            // Format the phone number based on prefix to follow the +44 XXXX XXX XXX style
            return `+44 ${CleanNumber.slice(CleanNumber.startsWith("44") ? 2 : 1, SpaceIndex)} ${CleanNumber.slice(SpaceIndex)}`;
        });
    }

    ExtractAddresses(HTML)
    {
        const CleanHtml = HTML.replace(/<[^>]*>/g, " ");
        const AddressRegex = /(?<![\w\-])\d{1,4}[.\s\-]([\w\-]+){1,2}[.\s\-](?:Acre|Alley|Approach|Arcade|Arch|Avenue|Bank|Boulevard|Bow|Bridge|Broadway|Brook|Brow|Bypass|Chase|Circus|Close|Court|Corner|Crescent|Cross|Croft|Dale|Dene|Drive|Drove|End|Field|Fold|Gardens|Gate|Ginnel|Grange|Green|Grove|Heights|Hill|Lane|Lea|Leasow|Leasowe|Market|Mead|Meadow|Mews|Mile|Mount|Nook|Parade|Pasture|Pass|Passage|Path|Park|Place|Plaza|Reach|Rise|Road|Row|Score|Side|Street|Square|Terrace|Twitten|Vale|Valley|View|Quay|Walk|Way|Yard|St|Rd|Ave|Ln|Dr|Cl|Cres|Ct|Sq|Pl|Ter|Wy)[,.\s\-]{1,3}([\w\-]+[,.\s\-]{1,3}){1,3}?[A-Z]{1,2}\d{1,2}[A-Z]?[.\s\-]?\d[A-Z]{2}(?![\w\-])/gi;

        const Addresses = CleanHtml.match(AddressRegex);
        return Addresses || [];
    }

    ExtractInformationFromHTML(HTML)
    {
        try
        {
            const knwlInstance = new knwl("english");
            knwlInstance.init(HTML);

            const ExtractedEmails = knwlInstance.get("emails");
            ExtractedEmails.forEach((Email) => {
                if (Email.address.toLowerCase().includes(this.CompanyDomain.split(".")[0]))
                {
                    this.Emails.add(Email.address);
                }
            });

            const ExtractedPhones = this.ExtractPhoneNumbers(HTML);
            this.PhoneNumbers = new Set([...this.PhoneNumbers, ...ExtractedPhones]);

            const ExtractedAddresses = this.ExtractAddresses(HTML);
            this.Addresses = new Set([...this.Addresses, ...ExtractedAddresses]);
        }

        catch (Error)
        {
            console.error("Error extracting information from HTML:", Error.message);
        }
    }

    ExtractInternalLinksFromHTML(HTML, BaseURL)
    {
        try
        {
            const $ = cheerio.load(HTML);
            const InternalURLs = new Set();

            $("a").each((Index, Element) => {

                let NewURL = $(Element).attr("href");

                if (NewURL)
                {
                    if (NewURL.startsWith("/"))
                    {
                        InternalURLs.add(new URL(NewURL, BaseURL).href);
                    }

                    else if (NewURL.startsWith(new URL(BaseURL).origin))
                    {
                        InternalURLs.add(NewURL);
                    }
                }
            });

            return Array.from(InternalURLs);
        }
        
        catch (Error)
        {
            console.error("Error extracting internal links:", Error.message);
            return [];
        }
    }

    async ProcessPages(URLs, Depth = 0)
    {
        for (const URL of URLs)
        {
            if (this.ExploredPages.has(URL)) { continue; }
            
            this.ExploredPages.add(URL);

            // Show progress through site
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(`Processed ${this.ExploredPages.size} Pages`);

            // Throttle requests with a delay to avoid being blocked
            // await Delay(Math.floor(Math.random() * 100 + 50));

            try
            {
                const HTML = await this.GetHTMLFromURL(URL);

                if (HTML)
                {
                    this.ExtractInformationFromHTML(HTML);

                    if (Depth < 50)
                    {
                        const NewURLs = this.ExtractInternalLinksFromHTML(HTML, URL);
                        await this.ProcessPages(NewURLs, Depth + 1);
                    }
                }
            }
            
            catch (Error)
            {
                console.error(`Error processing URL: ${URL}`, Error);
            }
        }
    }

    async GetURL(URL, RedirectCount = 0)
    {
        if (RedirectCount > 5)
        {
            console.log("Too many redirects");
            return null;
        }

        const Protocol = URL.startsWith("https") ? https : http;

        const Options = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
        };

        return new Promise((Resolve) => {

            const Request = Protocol.get(URL, Options, (Response) => {
    
                // Handle redirects (3xx status codes)
                if (Response.statusCode >= 300 && Response.statusCode < 400 && Response.headers.location)
                {
                    return Resolve(getURL(Response.headers.location, RedirectCount + 1));
                }
    
                // Successful response (2xx status codes)
                else if (Response.statusCode >= 200 && Response.statusCode < 300)
                {
                    return Resolve(URL);
                }
    
                // Unsuccessful response
                else
                {
                    console.error(`Failed to fetch page Status code: ${Response.statusCode}`);
                    return Resolve(null);
                }
            });
    
            // Handle error
            Request.on('error', (Error) => {
                console.error(`Request error: ${Error.message}`);
                Resolve(null);
            });
    
            // Handle connection timeout
            Request.setTimeout(30000, () => {
                console.error("Request timed out");
                Request.destroy();
                Resolve(null);
            });
        });
    }

    LogResults()
    {
        process.stdout.clearLine(0);

        console.log("\nEmails:", Array.from(this.Emails));
        console.log("\nPhone Numbers:", Array.from(this.PhoneNumbers));
        console.log("\nAddresses:", Array.from(this.Addresses));
        console.log("\nExplored Pages:", Array.from(this.ExploredPages));
    }

    async Run()
    {
        const ReadLineInterface = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    
        try
        {
            const Email = await new Promise((resolve) => {
                ReadLineInterface.question("Email >>> ", resolve);
            });
    
            // Validate email format (basic check)
            if (!Email.includes("@"))
            {
                throw new Error("Invalid email format. Please provide a valid email.");
            }
    
            this.CompanyDomain = Email.split("@")[1].toLowerCase();
            const FullURL = await this.GetURL(`https://www.${this.CompanyDomain}`);
    
            if (FullURL)
            {
                await this.ProcessPages([FullURL]);
                this.LogResults();
                process.exit(0);
            }
        }
        
        catch (Error) { console.error(`An error occurred: ${Error.message}`); }
        
        finally { ReadLineInterface.close(); }
    }
}

const Scraper = new CompanyWebsiteScraper();
Scraper.Run();

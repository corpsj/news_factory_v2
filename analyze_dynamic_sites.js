const { chromium } = require('playwright');

const dynamicSites = [
  {
    name: '목포시',
    url: 'https://www.mokpo.go.kr/www/mokpo_news/press_release'
  },
  {
    name: '보성군',
    url: 'https://www.boseong.go.kr/www/open_administration/city_news/press_release'
  }
];

async function analyzeDynamicSite(browser, site) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`DYNAMIC CONTENT ANALYSIS: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(100));

  const page = await browser.newPage();
  
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
    
    // Get full HTML structure
    const htmlAnalysis = await page.evaluate(() => {
      const result = {
        allDivs: document.querySelectorAll('div').length,
        allLists: document.querySelectorAll('ul, ol').length,
        allTables: document.querySelectorAll('table').length,
        allLinks: document.querySelectorAll('a').length,
        bodyText: document.body.innerText.substring(0, 500),
        mainContent: null,
        boardArea: null,
        articleElements: []
      };
      
      // Find main content area
      const mainSelectors = ['#content', '.content', 'main', '[role="main"]', '.main-content'];
      for (const selector of mainSelectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          result.mainContent = {
            selector: selector,
            html: elem.outerHTML.substring(0, 1000),
            text: elem.innerText.substring(0, 300)
          };
          break;
        }
      }
      
      // Look for board-like structures
      const boardSelectors = [
        'div[class*="board"]',
        'div[class*="list"]',
        'div[class*="article"]',
        'section[class*="board"]',
        'section[class*="list"]'
      ];
      
      for (const selector of boardSelectors) {
        const elems = document.querySelectorAll(selector);
        if (elems.length > 0) {
          result.boardArea = {
            selector: selector,
            count: elems.length,
            firstElem: elems[0].outerHTML.substring(0, 800)
          };
          break;
        }
      }
      
      // Find all elements that look like articles
      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(50, allElements.length); i++) {
        const elem = allElements[i];
        const text = elem.innerText || '';
        const html = elem.outerHTML;
        
        // Look for elements with article-like content
        if (text.length > 20 && text.length < 500 && 
            (text.includes('2026') || text.includes('2025') || text.includes('년'))) {
          result.articleElements.push({
            tag: elem.tagName,
            class: elem.className,
            text: text.substring(0, 100),
            html: html.substring(0, 300)
          });
        }
      }
      
      return result;
    });
    
    console.log(`\n📊 HTML STRUCTURE:`);
    console.log(`  Total divs: ${htmlAnalysis.allDivs}`);
    console.log(`  Total lists: ${htmlAnalysis.allLists}`);
    console.log(`  Total tables: ${htmlAnalysis.allTables}`);
    console.log(`  Total links: ${htmlAnalysis.allLinks}`);
    
    if (htmlAnalysis.mainContent) {
      console.log(`\n📍 MAIN CONTENT AREA:`);
      console.log(`  Selector: ${htmlAnalysis.mainContent.selector}`);
      console.log(`  Text preview: ${htmlAnalysis.mainContent.text}`);
    }
    
    if (htmlAnalysis.boardArea) {
      console.log(`\n📋 BOARD AREA:`);
      console.log(`  Selector: ${htmlAnalysis.boardArea.selector}`);
      console.log(`  Count: ${htmlAnalysis.boardArea.count}`);
      console.log(`  HTML sample:\n${htmlAnalysis.boardArea.firstElem}`);
    }
    
    console.log(`\n📰 ARTICLE-LIKE ELEMENTS (first 5):`);
    htmlAnalysis.articleElements.slice(0, 5).forEach((elem, idx) => {
      console.log(`  ${idx + 1}. <${elem.tag} class="${elem.class}">`);
      console.log(`     Text: ${elem.text}`);
    });
    
    // Try to find links with article content
    const articleLinks = await page.evaluate(() => {
      const links = [];
      const allLinks = document.querySelectorAll('a');
      
      for (let i = 0; i < Math.min(30, allLinks.length); i++) {
        const link = allLinks[i];
        const href = link.getAttribute('href');
        const text = link.innerText.trim();
        
        // Look for links that might be articles
        if (href && !href.includes('javascript') && text.length > 10 && text.length < 200) {
          links.push({
            href: href,
            text: text,
            class: link.className,
            parent: link.parentElement?.className
          });
        }
      }
      
      return links;
    });
    
    console.log(`\n🔗 POTENTIAL ARTICLE LINKS (first 10):`);
    articleLinks.slice(0, 10).forEach((link, idx) => {
      console.log(`  ${idx + 1}. href: ${link.href}`);
      console.log(`     text: ${link.text}`);
      console.log(`     class: ${link.class}`);
      console.log(`     parent: ${link.parent}`);
    });
    
    // Check for iframes
    const iframes = await page.evaluate(() => {
      const frames = document.querySelectorAll('iframe');
      return {
        count: frames.length,
        srcs: Array.from(frames).map(f => f.getAttribute('src')).slice(0, 5)
      };
    });
    
    console.log(`\n🖼️ IFRAMES:`);
    console.log(`  Count: ${iframes.count}`);
    if (iframes.srcs.length > 0) {
      console.log(`  Sources: ${iframes.srcs.join(', ')}`);
    }
    
    // Check for script tags that might load content
    const scripts = await page.evaluate(() => {
      const scriptTags = document.querySelectorAll('script');
      const inlineScripts = [];
      
      for (let i = 0; i < Math.min(10, scriptTags.length); i++) {
        const script = scriptTags[i];
        if (script.src) {
          inlineScripts.push({ type: 'external', src: script.src });
        } else if (script.innerText.length > 0) {
          inlineScripts.push({ 
            type: 'inline', 
            content: script.innerText.substring(0, 200) 
          });
        }
      }
      
      return inlineScripts;
    });
    
    console.log(`\n⚙️ SCRIPTS (first 5):`);
    scripts.slice(0, 5).forEach((script, idx) => {
      if (script.type === 'external') {
        console.log(`  ${idx + 1}. External: ${script.src}`);
      } else {
        console.log(`  ${idx + 1}. Inline: ${script.content.substring(0, 100)}`);
      }
    });
    
    console.log(`\n✓ Analysis complete for ${site.name}`);
    
  } catch (error) {
    console.error(`✗ Error: ${error.message}`);
  } finally {
    await page.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  
  try {
    for (const site of dynamicSites) {
      await analyzeDynamicSite(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log('DYNAMIC CONTENT ANALYSIS COMPLETE');
  console.log('='.repeat(100));
}

main().catch(console.error);

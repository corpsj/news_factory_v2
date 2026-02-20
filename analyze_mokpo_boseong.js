const { chromium } = require('playwright');

const sites = [
  {
    name: '목포시',
    url: 'https://www.mokpo.go.kr/www/mokpo_news/press_release'
  },
  {
    name: '보성군',
    url: 'https://www.boseong.go.kr/www/open_administration/city_news/press_release'
  }
];

async function analyzeSite(browser, site) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`DETAILED ANALYSIS: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(100));

  const page = await browser.newPage();
  
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Get the actual content area
    const contentAnalysis = await page.evaluate(() => {
      const result = {
        contentArea: null,
        allArticleLinks: [],
        boardStructure: null
      };
      
      // Find the main content area
      const contentDiv = document.querySelector('#content');
      if (contentDiv) {
        // Look for article list within content
        const allLinks = contentDiv.querySelectorAll('a');
        
        for (let i = 0; i < Math.min(20, allLinks.length); i++) {
          const link = allLinks[i];
          const href = link.getAttribute('href');
          const text = link.innerText.trim();
          
          // Filter for article-like links
          if (href && !href.includes('javascript') && text.length > 10 && text.length < 300) {
            result.allArticleLinks.push({
              href: href,
              text: text,
              class: link.className,
              parent: link.parentElement?.tagName,
              parentClass: link.parentElement?.className
            });
          }
        }
        
        // Get structure info
        result.contentArea = {
          html: contentDiv.outerHTML.substring(0, 2000),
          text: contentDiv.innerText.substring(0, 500),
          children: contentDiv.children.length
        };
      }
      
      // Look for specific board list structures
      const boardDivs = document.querySelectorAll('div[class*="list"]');
      if (boardDivs.length > 0) {
        result.boardStructure = {
          count: boardDivs.length,
          firstDiv: boardDivs[0].outerHTML.substring(0, 1000)
        };
      }
      
      return result;
    });
    
    console.log(`\n📍 CONTENT AREA:`);
    if (contentAnalysis.contentArea) {
      console.log(`  Children: ${contentAnalysis.contentArea.children}`);
      console.log(`  Text preview: ${contentAnalysis.contentArea.text}`);
    }
    
    console.log(`\n🔗 ARTICLE LINKS FOUND: ${contentAnalysis.allArticleLinks.length}`);
    contentAnalysis.allArticleLinks.slice(0, 10).forEach((link, idx) => {
      console.log(`  ${idx + 1}. href: ${link.href}`);
      console.log(`     text: ${link.text}`);
      console.log(`     parent: <${link.parent} class="${link.parentClass}">`);
    });
    
    if (contentAnalysis.boardStructure) {
      console.log(`\n📋 BOARD STRUCTURE:`);
      console.log(`  List divs found: ${contentAnalysis.boardStructure.count}`);
      console.log(`  First div HTML:\n${contentAnalysis.boardStructure.firstDiv}`);
    }
    
    // Try to find the actual article list container
    const listContainer = await page.evaluate(() => {
      const result = {
        containers: [],
        articles: []
      };
      
      // Look for common list containers
      const selectors = [
        'div.board_list_box',
        'div.list_box',
        'div[class*="article"]',
        'div[class*="news"]',
        'ul[class*="list"]',
        'div.module_list_box'
      ];
      
      for (const selector of selectors) {
        const elem = document.querySelector(selector);
        if (elem) {
          result.containers.push({
            selector: selector,
            html: elem.outerHTML.substring(0, 1500)
          });
        }
      }
      
      // Try to extract articles from content area
      const contentDiv = document.querySelector('#content');
      if (contentDiv) {
        // Look for divs that contain article-like content
        const allDivs = contentDiv.querySelectorAll('div');
        
        for (let i = 0; i < Math.min(50, allDivs.length); i++) {
          const div = allDivs[i];
          const text = div.innerText;
          const link = div.querySelector('a');
          
          // Look for divs with dates and links
          if (text.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/) && link) {
            const dateMatch = text.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/);
            result.articles.push({
              title: link.innerText.trim().substring(0, 100),
              href: link.getAttribute('href'),
              date: dateMatch ? dateMatch[0] : null,
              divClass: div.className
            });
          }
        }
      }
      
      return result;
    });
    
    console.log(`\n📦 LIST CONTAINERS FOUND: ${listContainer.containers.length}`);
    listContainer.containers.forEach((container, idx) => {
      console.log(`  ${idx + 1}. Selector: ${container.selector}`);
      console.log(`     HTML sample:\n${container.html}`);
    });
    
    console.log(`\n📰 ARTICLES EXTRACTED: ${listContainer.articles.length}`);
    listContainer.articles.slice(0, 5).forEach((article, idx) => {
      console.log(`  ${idx + 1}. Title: ${article.title}`);
      console.log(`     Href: ${article.href}`);
      console.log(`     Date: ${article.date}`);
      console.log(`     Class: ${article.divClass}`);
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
    for (const site of sites) {
      await analyzeSite(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(100));
}

main().catch(console.error);

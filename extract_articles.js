const { chromium } = require('playwright');

const sites = [
  {
    name: '목포시',
    url: 'https://www.mokpo.go.kr/www/mokpo_news/press_release'
  },
  {
    name: '담양군',
    url: 'https://www.damyang.go.kr/board/list?boardId=BBS_0000007&domainId=DOM_0000001&menuCd=DOM_000000190001005001&contentsSid=12'
  },
  {
    name: '구례군',
    url: 'https://www.gurye.go.kr/board/list.do?bbsId=BBS_0000000000000300&menuNo=115004006000'
  },
  {
    name: '고흥군',
    url: 'https://www.goheung.go.kr/boardList.do?boardId=BD_00025&pageId=www102'
  },
  {
    name: '보성군',
    url: 'https://www.boseong.go.kr/www/open_administration/city_news/press_release'
  }
];

async function extractArticles(browser, site) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`ARTICLE EXTRACTION: ${site.name}`);
  console.log(`URL: ${site.url}`);
  console.log('='.repeat(100));

  const page = await browser.newPage();
  
  try {
    await page.goto(site.url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Extract all article information
    const articles = await page.evaluate(() => {
      const result = {
        boardSelector: null,
        totalArticles: 0,
        articles: [],
        cssSelectors: {}
      };
      
      // Try different selectors
      const selectors = [
        'table tbody tr',
        '.board_list li',
        'ul.board_list li',
        'div[class*="board"] li',
        'li[class*="item"]',
        'div.list-item',
        'article'
      ];
      
      let rows = null;
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          result.boardSelector = selector;
          result.totalArticles = elements.length;
          rows = elements;
          break;
        }
      }
      
      if (rows) {
        // Extract from each row
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i];
          const article = {
            index: i + 1,
            title: null,
            href: null,
            date: null,
            author: null,
            views: null
          };
          
          // Find title and link
          const titleLink = row.querySelector('a');
          if (titleLink) {
            article.title = titleLink.innerText.trim();
            article.href = titleLink.getAttribute('href');
          }
          
          // Find date
          const dateMatch = row.innerText.match(/\d{4}[-\/]\d{2}[-\/]\d{2}/);
          if (dateMatch) {
            article.date = dateMatch[0];
          }
          
          // Find other info (author, views, etc)
          const cells = row.querySelectorAll('td, span, div');
          const cellTexts = Array.from(cells).map(c => c.innerText.trim()).filter(t => t.length > 0);
          
          // Try to identify author and views
          for (const text of cellTexts) {
            if (text.match(/\d+\s*(회|조회|view)/)) {
              article.views = text;
            }
            if (text.match(/[가-힣]+\s*(과|부|팀)/)) {
              article.author = text;
            }
          }
          
          result.articles.push(article);
        }
      }
      
      return result;
    });
    
    console.log(`\n📊 EXTRACTION RESULTS:`);
    console.log(`  Board Selector: ${articles.boardSelector}`);
    console.log(`  Total Articles on Page: ${articles.totalArticles}`);
    
    console.log(`\n📰 EXTRACTED ARTICLES (first 5):`);
    articles.articles.forEach((article) => {
      console.log(`\n  ARTICLE ${article.index}:`);
      console.log(`    Title: ${article.title || 'N/A'}`);
      console.log(`    Href: ${article.href || 'N/A'}`);
      console.log(`    Date: ${article.date || 'N/A'}`);
      if (article.author) console.log(`    Author: ${article.author}`);
      if (article.views) console.log(`    Views: ${article.views}`);
    });
    
    // Try to navigate to first article
    if (articles.articles.length > 0 && articles.articles[0].href) {
      const firstHref = articles.articles[0].href;
      let detailUrl;
      
      try {
        if (firstHref.startsWith('http')) {
          detailUrl = firstHref;
        } else {
          detailUrl = new URL(firstHref, site.url).href;
        }
        
        console.log(`\n🔗 DETAIL PAGE TEST:`);
        console.log(`  Navigating to: ${detailUrl}`);
        
        await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15000 });
        const finalUrl = page.url();
        console.log(`  Final URL: ${finalUrl}`);
        
        // Get detail page info
        const detailInfo = await page.evaluate(() => {
          return {
            title: document.querySelector('h1, h2, .title, .article-title')?.innerText?.trim() || 'N/A',
            date: document.querySelector('.date, .regdate, .write-date, span[class*="date"]')?.innerText?.trim() || 'N/A',
            author: document.querySelector('.author, .writer, span[class*="author"]')?.innerText?.trim() || 'N/A',
            contentLength: document.querySelector('.content, .article-content, .view-content, #content')?.innerText?.length || 0
          };
        });
        
        console.log(`  Title: ${detailInfo.title}`);
        console.log(`  Date: ${detailInfo.date}`);
        console.log(`  Author: ${detailInfo.author}`);
        console.log(`  Content Length: ${detailInfo.contentLength} chars`);
        
      } catch (error) {
        console.log(`  ⚠ Could not navigate to detail page: ${error.message}`);
      }
    }
    
    console.log(`\n✓ Extraction complete for ${site.name}`);
    
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
      await extractArticles(browser, site);
    }
  } finally {
    await browser.close();
  }
  
  console.log(`\n${'='.repeat(100)}`);
  console.log('ARTICLE EXTRACTION COMPLETE');
  console.log('='.repeat(100));
}

main().catch(console.error);

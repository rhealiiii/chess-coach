const {test,expect}=require('@playwright/test');
test('minimal mobile play and opt-in coaching',async({page},testInfo)=>{
 await page.goto('/');await expect(page.locator('#board .sq')).toHaveCount(64);await expect(page.locator('#board .piece-svg')).toHaveCount(32);
 await expect(page.locator('#review')).toBeDisabled();await expect(page.locator('#coach')).not.toBeVisible();await expect(page.locator('[data-route]')).toHaveCount(0);
 for(const [width,height] of [[320,568],[375,667],[390,664],[390,844],[430,932]]){
  await page.setViewportSize({width,height});const box=await page.locator('#board').boundingBox();expect(box.width).toBeGreaterThan(240);expect(Math.abs(box.width-box.height)).toBeLessThan(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  const footer=await page.locator('footer').boundingBox();expect(footer.y+footer.height).toBeLessThanOrEqual(height+1);
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath('minimal-play.png'),fullPage:true});
 await page.locator('#hint').tap();await expect(page.locator('#hint-content')).toBeVisible({timeout:60000});await expect(page.locator('#hint-options .hint-option')).toHaveCount(3);const historyBefore=await page.locator('#history').textContent();await page.locator('#hint-options .hint-option').nth(1).tap();await expect(page.locator('#hint-options .hint-option').nth(1)).toHaveAttribute('aria-pressed','true');await expect(page.locator('#hint-why')).not.toBeEmpty();await expect(page.locator('#hint-risk')).toContainText('首选');await expect(page.locator('#history')).toHaveText(historyBefore);await page.screenshot({path:testInfo.outputPath('three-candidate-advice.png'),fullPage:true});await page.locator('#hint-close').tap();await expect(page.locator('#hint-panel')).not.toBeVisible();
 await page.locator('#board [data-square="b8"]').tap();await expect(page.locator('#board .target')).toHaveCount(2);await expect(page.locator('#status')).toContainText('预览');
 await page.locator('#board [data-square="e2"]').tap();await expect(page.locator('#board .target')).toHaveCount(2);await page.locator('#board [data-square="e4"]').tap();
 await expect(page.locator('#board')).toHaveAttribute('aria-busy','false',{timeout:60000});await expect(page.locator('#turn')).toContainText('轮到你');await expect(page.locator('#review')).toBeEnabled();await expect(page.locator('#board [data-route]')).toHaveCount(0);
 await page.locator('#review').tap();await expect(page.locator('#review-content')).toBeVisible({timeout:60000});await expect(page.locator('#review-played')).toContainText('e2 → e4');await expect(page.locator('#review-best')).not.toBeEmpty();await expect(page.locator('#review-knowledge')).not.toBeEmpty();await expect(page.locator('#review-board .sq')).toHaveCount(64);await expect(page.locator('#review-arrows [data-route="last"]')).toHaveCount(1);
 await page.screenshot({path:testInfo.outputPath('on-demand-coaching.png'),fullPage:true});await page.locator('#coach-close').tap();await expect(page.locator('#coach')).not.toBeVisible();
 await page.locator('#undo').tap();await expect(page.locator('#review')).toBeDisabled();
 await page.locator('#menu-open').tap();await expect(page.locator('#menu')).toBeVisible();await page.locator('#view').selectOption('b');await page.locator('#menu-close').tap();await expect(page.locator('#board .sq').first()).toHaveAttribute('data-square','h1');
 await page.locator('#restart').tap();await expect(page.locator('#board .piece-svg')).toHaveCount(32);
});
test('automatic end-game synthesis, persistence and no click-by-click report',async({page})=>{
 await page.addInitScript(()=>{if(!localStorage.getItem('chess-coach-learning-v1'))localStorage.setItem('chess-coach-learning-v1',JSON.stringify({games:[],active:{id:'finished-test',started:new Date().toISOString(),moves:['f2f3','e7e5','g2g4','d8h4'],hints:[{key:'first',ply:0,phase:'开局',tags:['中心与计划']},{key:'second',ply:2,phase:'开局',tags:['中心与计划']}],reviews:{}}}));});
 await page.goto('/');await expect(page.locator('#learning-panel')).toBeVisible();await expect(page.locator('#learning-progress')).toContainText('总结已完成',{timeout:90000});await expect(page.locator('#learning-content')).toContainText('黑方获胜');await expect(page.locator('#learning-content')).toContainText('2 个不同局面');await expect(page.locator('#learning-content')).toContainText('经常求助的决策');await expect(page.locator('#learning-content')).toContainText('可能原因');await expect(page.locator('#learning-content')).toContainText('下一局练习');
 const counts=await page.evaluate(()=>{const d=JSON.parse(localStorage.getItem('chess-coach-learning-v1'));return {games:d.games.length,coverage:d.games[0].coverage};});expect(counts).toEqual({games:1,coverage:2});
 await page.reload();await expect(page.locator('#learning-panel')).toBeVisible();await expect(page.locator('#learning-progress')).toContainText('已恢复');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chess-coach-learning-v1')).games.length)).toBe(1);
 await page.locator('#learning-close').tap();await page.locator('#restart').tap();await expect(page.locator('#turn')).toContainText('轮到你');expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('chess-coach-learning-v1')).games.length)).toBe(1);
});

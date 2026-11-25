/**
 * Script de pruebas E2E con Selenium WebDriver para CP-07, CP-08, CP-11 y CP-12.
 * Requiere: npm install --no-save selenium-webdriver
 * Ejecutar con backend (puerto 3000) y frontend (puerto 5173) activos:
 *   npm run test:e2e
 */
const assert = require('node:assert');

async function run() {
    let Builder, By, until;
    try {
        ({ Builder, By, until } = require('selenium-webdriver'));
    } catch {
        console.error('Para ejecutar Selenium WebDriver instala: npm install --no-save selenium-webdriver');
        process.exit(1);
    }

    const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    const driver = await new Builder().forBrowser('chrome').build();

    try {
        // CP-11: Login con credenciales incorrectas
        await driver.get(`${FRONTEND_URL}/login`);
        await driver.findElement(By.id('email')).sendKeys('veterinario.prueba@petcare.cl');
        await driver.findElement(By.id('password')).sendKeys('ClaveIncorrecta2026!');
        await driver.findElement(By.css('button[type="submit"]')).click();
        const errEl = await driver.wait(until.elementLocated(By.id('login-error')), 5000);
        const errText = await errEl.getText();
        assert.ok(errText.toLowerCase().includes('inválidas'), `CP-11 error inesperado: ${errText}`);
        console.log('CP-11 PASSED');

        // CP-07: Login válido como Veterinario
        await driver.findElement(By.id('password')).clear();
        await driver.findElement(By.id('password')).sendKeys('SecurePassword2026!');
        await driver.findElement(By.css('button[type="submit"]')).click();
        const titleEl = await driver.wait(until.elementLocated(By.css('[data-testid="dashboard-title"]')), 5000);
        const titleText = await titleEl.getText();
        assert.ok(titleText.includes('Veterinario'), `CP-07 título inesperado: ${titleText}`);
        console.log('CP-07 PASSED');

        // Cerrar sesión y entrar como Recepcionista para CP-12 y CP-08
        await driver.findElement(By.xpath("//button[contains(text(),'Cerrar Sesión')]")).click();
        await driver.wait(until.elementLocated(By.id('email')), 5000);
        await driver.findElement(By.id('email')).sendKeys('recepcionista.prueba@petcare.cl');
        await driver.findElement(By.id('password')).sendKeys('SecurePassword2026!');
        await driver.findElement(By.css('button[type="submit"]')).click();
        await driver.wait(until.elementLocated(By.css('[data-testid="dashboard-title"]')), 5000);

        await driver.get(`${FRONTEND_URL}/citas/nueva`);
        await driver.wait(until.elementLocated(By.id('propietarioId')), 5000);

        // CP-12: Formulario incompleto (sin hora)
        const propSelect = await driver.findElement(By.id('propietarioId'));
        const options = await propSelect.findElements(By.tagName('option'));
        await options[1].click();
        await driver.findElement(By.id('fecha')).sendKeys('2026-11-15');
        await driver.findElement(By.id('motivo')).sendKeys('Control general y revisión de vacunas');
        await driver.findElement(By.css('button[type="submit"]')).click();
        const citaErr = await driver.wait(until.elementLocated(By.id('cita-error')), 5000);
        assert.ok((await citaErr.getText()).toLowerCase().includes('incompletos'));
        console.log('CP-12 PASSED');

        // CP-08: Agendamiento completo
        await driver.findElement(By.id('hora')).sendKeys('11:30');
        await driver.findElement(By.css('button[type="submit"]')).click();
        const citaOk = await driver.wait(until.elementLocated(By.id('cita-success')), 5000);
        assert.ok((await citaOk.getText()).includes('Cita registrada correctamente'));
        console.log('CP-08 PASSED');
    } finally {
        await driver.quit();
    }
}

run().catch((err) => {
    console.error('Selenium E2E FAILED:', err);
    process.exit(1);
});

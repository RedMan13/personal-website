const fakeExtensionID = 'NUHUHYOURNOTMYMOM';
Scratch.extensions.register({ getInfo: () => ({ id: fakeExtensionID }) });

const urlToTest = <?= json_encode($_GET['file']) ?>;
async function loadTest() {
    console.log('loading file test...')
    const res = await fetch(urlToTest);
    const jsCode = await res.text();
    console.log(jsCode)
    window.isInTextBox = true
    const jsFunc = new Function(jsCode);
    window.testExports = jsFunc();
    console.log('loaded the file to be tested')
}

loadTest()
window.reloadTest = () => {
    delete window.testExports;
    loadTest();
}
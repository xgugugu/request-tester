const gi = require('node-gtk');
const Gtk = gi.require('Gtk', '3.0');
const GObject = gi.require('GObject')
const axios = require('axios');

function makeString(a) {
    const value = new GObject.Value();
    value.init(GObject.typeFromName('gchararray'));
    value.setString(a);
    return value;
}

gi.startLoop();
Gtk.init();

const builder = Gtk.Builder.newFromFile('./main.glade');

const mainWindow = builder.getObject('mainWindow');
mainWindow.on('show', Gtk.main);
mainWindow.on('destroy', Gtk.mainQuit);

let send_lock = false;

builder.connectSignals({
    on_Send_clicked() {
        if (send_lock) return;
        send_lock = true;
        const method = builder.getObject('Method').getActiveText();
        const url = builder.getObject('URL').getText();
        const states = builder.getObject('State');
        const result = builder.getObject('Result');
        const headers = builder.getObject('Headers');
        states.clear();
        const state_iter = states.append();
        states.setValue(state_iter, 0, makeString('Loading...'));
        result.text = '';
        headers.clear();
        function displayResult(res) {
            // 状态
            states.clear();
            const state_url_iter = states.append();
            states.setValue(state_url_iter, 0, makeString('URL'));
            states.setValue(state_url_iter, 1, makeString(res.config.url));
            const state_method_iter = states.append();
            states.setValue(state_method_iter, 0, makeString('Method'));
            states.setValue(state_method_iter, 1, makeString(res.config.method));
            const state_state_iter = states.append();
            states.setValue(state_state_iter, 0, makeString('Status'));
            states.setValue(state_state_iter, 1, makeString(`${res.status} ${res.statusText}`));
            // 响应
            if (typeof (res.data) != 'string') {
                res.data = JSON.stringify(res.data, null, 2);
            }
            result.text = res.data;
            // 头
            for (const i in res.headers) {
                const iter = headers.append();
                headers.setValue(iter, 0, makeString(i));
                headers.setValue(iter, 1, makeString(res.headers[i]));
            }
        }
        const sendParams = builder.getObject('sendParams');
        const sendHeaders = builder.getObject('sendHeaders');
        const sendData = builder.getObject('sendData');
        let param = {}, header = {}, data = sendData.text;
        try {
            param = JSON.parse(`{${sendParams.text}}`);
            header = JSON.parse(`{${sendHeaders.text}}`);
        } catch (err) {
            states.clear();
            const state_code_iter = states.append();
            states.setValue(state_code_iter, 0, makeString('Params or headers error'));
            send_lock = false;
            return;
        }
        axios({
            method: method,
            url: url,
            params: param,
            headers: header,
            data: data
        }).then((res) => {
            displayResult(res);
        }).catch((err) => {
            if (err.response) {
                displayResult(err.response);
            } else if (err.request) {
                states.clear();
                const state_code_iter = states.append();
                states.setValue(state_code_iter, 0, makeString('Error'));
                states.setValue(state_code_iter, 1, makeString(err.code));
            } else {
                states.clear();
                const state_code_iter = states.append();
                states.setValue(state_code_iter, 0, makeString('Error'));
                states.setValue(state_code_iter, 1, makeString(err.message));
            }
        }).finally(() => send_lock = false);
    }
});

mainWindow.showAll();
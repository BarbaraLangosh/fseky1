const express = require("express");
const app = express();
const { exec, execSync } = require('child_process');
const port = process.env.SERVER_PORT || process.env.PORT || 3000;        
const UUID = process.env.UUID || '200ca9fb-ecd5-4f94-8fdd-25a940dcd691'; //若需要改UUID，需要在config.json里改为一致
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nezha.godtop.us.kg';     
const NEZHA_PORT = process.env.NEZHA_PORT || '443';                     // 哪吒端口为{443,8443,2096,2087,2083,2053}其中之一开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || 'QiCTfx71j0fwG6q39P';   // 没用哪吒，把这个参数空着
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || 'choreo-us.godtop.us.kg';     // 建议使用token，argo端口8080，cf后台设置需对应,使用json需上传json和yml文件至files目录
const ARGO_AUTH = process.env.ARGO_AUTH || 'eyJhIjoiMDNmZDcwNjc2ZjgyMDA4MzVmYTViM2EyZjYxMDE2YzIiLCJ0IjoiYWQxYmVhN2YtMTIzMC00ZjY0LTk3YWItMTgyN2U1OGYzMmU0IiwicyI6IlpqUTRZV1k1TWpBdE1qazNOUzAwWWpNekxUZzNZelV0TTJKaFpHTTRNekl3T0dObSJ9';
const CFIP = process.env.CFIP || 'www.visa.com.tw';
const NAME = process.env.NAME || 'Choreo-US';

// root route
app.get("/", function(req, res) {
  res.send("Hello world!");
});

const metaInfo = execSync(
  'curl -s https://speed.cloudflare.com/meta | awk -F\\" \'{print $26"-"$18}\' | sed -e \'s/ /_/g\'',
  { encoding: 'utf-8' }
);
const ISP = metaInfo.trim();

// sub subscription
app.get('/sub', (req, res) => {
  const VMESS = { v: '2', ps: `${NAME}-${ISP}`, add: CFIP, port: '443', id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: ARGO_DOMAIN, path: '/vmess?ed=2048', tls: 'tls', sni: ARGO_DOMAIN, alpn: '' };
  const vlessURL = `vless://${UUID}@${CFIP}:443?encryption=none&security=tls&sni=${ARGO_DOMAIN}&type=ws&host=${ARGO_DOMAIN}&path=%2Fvless?ed=2048#${NAME}-${ISP}`;
  const vmessURL = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
  const trojanURL = `trojan://${UUID}@${CFIP}:443?security=tls&sni=${ARGO_DOMAIN}&type=ws&host=${ARGO_DOMAIN}&path=%2Ftrojan?ed=2048#${NAME}-${ISP}`;
  
  const base64Content = Buffer.from(`${vlessURL}\n\n${vmessURL}\n\n${trojanURL}`).toString('base64');

  res.type('text/plain; charset=utf-8').send(base64Content);
});

// run-nezha
  let NEZHA_TLS = '';
  if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
    if (tlsPorts.includes(NEZHA_PORT)) {
      NEZHA_TLS = '--tls';
    } else {
      NEZHA_TLS = '';
    }
  const command = `nohup ./swith -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
  try {
    exec(command);
    console.log('swith is running');

    setTimeout(() => {
      runWeb();
    }, 2000);
  } catch (error) {
    console.error(`swith running error: ${error}`);
  }
} else {
  console.log('NEZHA variable is empty, skip running');
  runWeb();
}

// run-xr-ay
function runWeb() {
  const command1 = `nohup ./web -c ./config.json >/dev/null 2>&1 &`;
  exec(command1, (error) => {
    if (error) {
      console.error(`web running error: ${error}`);
    } else {
      console.log('web is running');

      setTimeout(() => {
        runServer();
      }, 2000);
    }
  });
}

// run-server
function runServer() {
  let command2 = '';
  if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
    command2 = `nohup ./server tunnel --region us --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
  } else {
    command2 = `nohup ./server tunnel --region us --edge-ip-version auto --config tunnel.yml run >/dev/null 2>&1 &`;
  }

  // 使用 exec 直接运行命令并将输出打印到控制台
  exec(command2, (error, stdout, stderr) => {
    if (error) {
      console.error(`server running error: ${error}`);
      return;
    }
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
  });

  console.log('server is running');
}

runServer();

app.listen(port, () => console.log(`App is listening on port ${port}!`));

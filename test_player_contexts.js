import axios from 'axios';

async function testPlayer() {
  const contexts = [
    { name: 'ANDROID_VR', client: { clientName: 'ANDROID_VR', clientVersion: '1.56.21', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36' },
    { name: 'ANDROID', client: { clientName: 'ANDROID', clientVersion: '19.09.37', hl: 'en', gl: 'US', androidSdkVersion: 30 }, ua: 'com.google.android.youtube/19.09.37 (Linux; U; Android 11)' },
    { name: 'IOS', client: { clientName: 'IOS', clientVersion: '19.09.3', hl: 'en', gl: 'US', deviceMake: 'Apple', deviceModel: 'iPhone14,2' }, ua: 'com.google.ios.youtube/19.09.3 (iPhone14,2; U; CPU iOS 17_4 like Mac OS X)' },
    { name: 'WEB', client: { clientName: 'WEB', clientVersion: '2.20240301.01.00', hl: 'en', gl: 'US' }, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
  ];

  for (const c of contexts) {
    try {
      const resp = await axios.post('https://www.youtube.com/youtubei/v1/player', {
        context: { client: c.client },
        videoId: '9bZkp7q19f0'
      }, {
        headers: { 'Content-Type': 'application/json', 'User-Agent': c.ua }
      });
      const streamingData = resp.data?.streamingData;
      const formats = streamingData?.adaptiveFormats || [];
      const audioWithUrl = formats.filter(f => f.mimeType?.startsWith('audio/') && f.url);
      const playabilityStatus = resp.data?.playabilityStatus?.status;
      console.log(`Context [${c.name}]: status=${playabilityStatus}, formats=${formats.length}, audioWithDirectUrl=${audioWithUrl.length}`);
    } catch (e) {
      console.log(`Context [${c.name}]: error=${e.message}`);
    }
  }
}

testPlayer();

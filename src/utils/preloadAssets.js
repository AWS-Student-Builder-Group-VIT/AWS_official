import awsIcon from '../assets/aws_icon.jpeg';
import hqSvg from '../assets/aws_club_hq.svg';
import ankitImg from '../assets/Board memb/ankit.png';
import vivekPopupImg from '../assets/Board memb/vivek_generated.png';
import vivekImg from '../assets/Board memb/Vivek.jpeg';
import arshiImg from '../assets/Board memb/Arshi_card.jpeg';
import arshiPopupImg from '../assets/Board memb/arshi_generated.png';
import vidiImg from '../assets/Board memb/vidi.jpeg';
import vidiPopupImg from '../assets/Board memb/vidi_generated.png';
import tanishaImg from '../assets/Board memb/tanisha.png';
import tanishaPopupImg from '../assets/Board memb/tanisha_generated.png';
import aeshaImg from '../assets/Board memb/aesha.jpeg';
import aeshaPopupImg from '../assets/Board memb/aesha_gerated.png';
import abhishekImg from '../assets/Board memb/abhishek.jpg';
import abhishekPopupImg from '../assets/Board memb/abhishek_generated.png';
import jaanyaImg from '../assets/Board memb/jannya.jpeg';
import jaanyaPopupImg from '../assets/Board memb/jannya_generated.png';
import ayushImg from '../assets/Board memb/ayush.jpeg';
import ayushPopupImg from '../assets/Board memb/ayush_generated.png';
import pihuImg from '../assets/Board memb/pihu.jpeg';
import pihuPopupImg from '../assets/Board memb/pihu_generated.png';

const imagesToPreload = [
  awsIcon,
  hqSvg,
  ankitImg,
  vivekPopupImg,
  vivekImg,
  arshiImg,
  arshiPopupImg,
  vidiImg,
  vidiPopupImg,
  tanishaImg,
  tanishaPopupImg,
  aeshaImg,
  aeshaPopupImg,
  abhishekImg,
  abhishekPopupImg,
  jaanyaImg,
  jaanyaPopupImg,
  ayushImg,
  ayushPopupImg,
  pihuImg,
  pihuPopupImg
];

export function preloadAllImages() {
  return Promise.all(
    imagesToPreload.map(
      (src) =>
        new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = resolve;
          img.onerror = resolve; // Resolve on error so we don't block the app
        })
    )
  );
}

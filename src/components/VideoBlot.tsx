// src/components/VideoBlot.ts
import { Quill } from 'react-quill';
import DOMPurify from 'dompurify';

const BlockEmbed = Quill.import('blots/block/embed');

class VideoBlot extends BlockEmbed {
  static blotName = 'video';
  static tagName = 'div';

  static create(value: string | { url: string }) {
    const node = super.create() as HTMLDivElement;
    const url = typeof value === 'string' ? value : value.url;
    
    // Set the class attribute using setAttribute
    node.setAttribute('class', 'aspect-w-4 aspect-h-3 my-4'); // <--- CORRECTED LINE
    
    const iframe = document.createElement('iframe');
    iframe.setAttribute('src', DOMPurify.sanitize(url));
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('class', 'w-full h-full rounded-md');
    
    node.appendChild(iframe);
    
    return node;
  }
  
  static value(node: HTMLElement) {
    const iframe = node.querySelector('iframe');
    return iframe ? { url: iframe.getAttribute('src') } : null;
  }
}

export default VideoBlot;
import { useState, useRef, useEffect, useCallback } from 'react';

const cards = [
  { icon: '☁', num: '01', title: 'HANDS-ON WORKSHOPS', desc: 'Dive deep into AWS services. From EC2 basics to serverless architectures — you build, not just watch.' },
  { icon: '🏅', num: '02', title: 'AWS CREDITS & VOUCHERS', desc: '$25 AWS credits for core team. Certification exam vouchers to get you officially certified.' },
  { icon: '🎤', num: '03', title: 'SPEAKER SESSIONS', desc: 'Direct access to industry veterans, AWS community builders, and certified cloud architects.' },
  { icon: '🤝', num: '04', title: 'REAL NETWORKING', desc: 'Connect with the global AWS Cloud Clubs community and build relationships that outlast college.' },
  { icon: '🛠', num: '05', title: 'BUILD & DEPLOY', desc: 'Work on actual cloud projects. Ship real things. Add AWS-powered work to your resume.' },
  { icon: '📜', num: '06', title: 'CERTIFICATION TRACK', desc: 'Structured learning paths toward AWS certifications. Go from zero to certified with club support.' },
  { icon: '🌐', num: '07', title: 'COMMUNITY DAY', desc: 'Participate in AWS Student Community Day — a large-scale student-led event with clubs nationwide.' },
];

/* ── Special interactive Card 1 ── */
function WorkshopCard({ expanded, onToggle }) {
  return (
    <div className="wj-ws-outer">
      <div
        className={`wj-ws-card${expanded ? ' wj-ws-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-ws-number">01</span>
        <div className="wj-ws-cloud">
          <svg viewBox="0 0 280 160" preserveAspectRatio="none">
            <path d="M0,130 C18,95 42,78 72,94 C90,58 120,46 152,68 C170,34 200,30 230,52 C250,38 268,56 280,82" />
          </svg>
        </div>
        <span className="wj-ws-title">Hands on Workshop</span>
        <div className="wj-ws-desc">
          <p>Dive deep into AWS services. From EC2 basics to serverless architectures — you build, not just watch.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 2 ── */
function CreditsCard({ expanded, onToggle }) {
  return (
    <div className="wj-cr-outer">
      <div
        className={`wj-cr-card${expanded ? ' wj-cr-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-cr-number">02</span>
        <div className="wj-cr-award">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <g data-name="08-award" id="_08-award">
              <polygon points="23 11 16 15 9 11 9 1 23 1 23 11"/>
              <circle cx="16" cy="23" r="8"/>
              <path d="M16,19a4,4,0,0,0-4,4"/>
              <path d="M16,27a4,4,0,0,0,4-4"/>
              <line x1="13" x2="13" y1="1" y2="13"/>
              <line x1="19" x2="19" y1="1" y2="13"/>
            </g>
          </svg>
        </div>
        <span className="wj-cr-title">AWS Credits & Vouchers</span>
        <div className="wj-cr-desc">
          <p>$25 AWS credits for core team. Certification exam vouchers to get you officially certified.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 3 ── */
function SpeakerCard({ expanded, onToggle }) {
  return (
    <div className="wj-sp-outer">
      <div
        className={`wj-sp-card${expanded ? ' wj-sp-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-sp-number">03</span>
        <div className="wj-sp-mic">
          <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(1.5, 4) rotate(45 28.5 26)">
              {/* Handle */}
              <rect x="24" y="22" width="9" height="18" rx="4.5" />
              {/* Connector */}
              <rect x="22" y="18" width="13" height="5" rx="2" />
              {/* Mic Head */}
              <ellipse cx="28.5" cy="12" rx="9" ry="10" />
              {/* Mesh */}
              <line x1="22" y1="8" x2="35" y2="8" />
              <line x1="21" y1="11" x2="36" y2="11" />
              <line x1="21" y1="14" x2="36" y2="14" />
              <line x1="22" y1="17" x2="35" y2="17" />
            </g>
          </svg>
        </div>
        <span className="wj-sp-title">Speaker Sessions</span>
        <div className="wj-sp-desc">
          <p>Direct access to industry veterans, AWS community builders, and certified cloud architects.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 4 ── */
function NetworkingCard({ expanded, onToggle }) {
  return (
    <div className="wj-nw-outer">
      <div
        className={`wj-nw-card${expanded ? ' wj-nw-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-nw-number">04</span>
        <div className="wj-nw-handshake">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <g>
              <path d="M10.17 38a1.007 1.007 0 0 1-.458-.11L2.09 33.964a1 1 0 0 1-.434-1.342l8.954-17.686a1 1 0 0 1 1.347-.439l7.251 3.7a1 1 0 0 1 .448 1.324l-8.584 17.908a1.006 1.006 0 0 1-.583.516 1.028 1.028 0 0 1-.319.055Zm-6.281-5.36 5.824 3 7.718-16.1-5.49-2.8Z" />
              <path d="M20.53 24.084a1 1 0 0 1-.491-.129l-2.906-1.637a1 1 0 1 1 .981-1.743l2.4 1.351c.937-.568 2.965-1.791 4.263-2.524 2.119-1.2 3.611-1.035 5.324.588a1 1 0 0 1-1.375 1.452c-1.064-1.008-1.618-1.06-2.965-.3-1.668.943-4.677 2.777-4.708 2.8a1 1 0 0 1-.523.142Z" />
              <path d="M46.837 41.483a3.827 3.827 0 0 1-2.072-.547c-.92-.614-4.968-4.584-5.77-5.373a1 1 0 0 1 1.4-1.426c1.8 1.777 4.888 4.742 5.477 5.135a2.328 2.328 0 0 0 2.364-.244 1.422 1.422 0 0 0-.04-2.182c-1.022-1.15-5.268-5.235-6.2-6.131a66.293 66.293 0 0 1-9.432-4.322l-1.052.688a4.582 4.582 0 0 1-1.771 2.731 2.759 2.759 0 0 1-2.278.532 3.475 3.475 0 0 1-2.409-1.444 4.74 4.74 0 0 1-.166-3.617c.853-3.414 2.237-4.293 4.152-5.509l.421-.269c2.11-1.355 3.921-2.077 5.909-1.182 1.236.557 5.623 2.256 6.869 2.738l4.176-1.369a1 1 0 0 1 .623 1.9l-4.515 1.48a1.007 1.007 0 0 1-.67-.016c-.237-.092-5.815-2.238-7.3-2.908-.891-.4-1.832-.359-4.008 1.039l-.43.275c-1.747 1.109-2.624 1.667-3.284 4.306-.338 1.352-.182 1.9-.059 2.1.158.264.524.371 1.107.517a.856.856 0 0 0 .706-.2A2.587 2.587 0 0 0 29.6 26.4a1 1 0 0 1 .448-.75l1.925-1.259A1 1 0 0 1 33 24.353c.068.037 6.81 3.724 9.763 4.5a1.018 1.018 0 0 1 .438.245c.216.207 5.3 5.075 6.494 6.422a3.4 3.4 0 0 1-.04 4.924 4.013 4.013 0 0 1-2.818 1.039Z" />
              <path d="M48.947 37.182a1 1 0 0 1-.405-1.914l3.508-1.554a1 1 0 1 1 .81 1.828L49.351 37.1a1 1 0 0 1-.404.082Z" />
              <path d="M53.534 38a1 1 0 0 1-.927-.626l-7.548-18.726a1 1 0 0 1 .59-1.316l8.066-2.886a1 1 0 0 1 1.266.572l7.4 18.574a1 1 0 0 1-.571 1.3l-7.918 3.038a1 1 0 0 1-.358.07zM47.3 18.864l6.791 16.847 6.054-2.32-6.665-16.737zm-4.968 25.652a3.386 3.386 0 0 1-2.264-.779c-1.339-1.19-4.781-4.63-4.927-4.776a1 1 0 0 1 1.414-1.414c.035.035 3.547 3.545 4.841 4.7a1.951 1.951 0 0 0 1.8.12A2.709 2.709 0 0 0 45 40.208a1 1 0 0 1 1.971.34 4.712 4.712 0 0 1-3.11 3.7 4.654 4.654 0 0 1-1.529.268z" />
              <path d="M37.678 46.94a3.164 3.164 0 0 1-2.241-.8l-3.552-3.552 1.415-1.415 3.552 3.552a1.8 1.8 0 0 0 1.457.136 2.636 2.636 0 0 0 1.918-1.879 1 1 0 1 1 1.912.586 4.657 4.657 0 0 1-4.46 3.372Z" />
              <path d="M33.866 49.611a3.632 3.632 0 0 1-2.269-.735 298.882 298.882 0 0 0-2.715-2.148 1 1 0 1 1 1.231-1.576s1.249.975 2.734 2.163a2.127 2.127 0 0 0 2.1.043 1.559 1.559 0 0 0 .942-1.493 1 1 0 0 1 .969-1.03 1.013 1.013 0 0 1 1.03.97 3.558 3.558 0 0 1-2.048 3.343 4.461 4.461 0 0 1-1.974.463Z" />
              <path d="M26.372 49.148a2.5 2.5 0 0 1-.947-.19A4.416 4.416 0 0 1 23.5 47.12a3.151 3.151 0 0 1-2.083-.313 4.825 4.825 0 0 1-2.086-3.088 1 1 0 0 1 .137-.741c.813-1.268 2.039-3.239 2.222-3.65A2.546 2.546 0 0 1 23.35 38a3.358 3.358 0 0 1 2.842.544 2.98 2.98 0 0 1 1.324 2.742 3.329 3.329 0 0 1 2.46 1.251 3.59 3.59 0 0 1 .383 3.067 5.949 5.949 0 0 1-3 3.344 2.534 2.534 0 0 1-.987.2Zm-1.188-3.121c.314.531.875 1.293 1.4 1.074a3.949 3.949 0 0 0 1.882-2.139 1.621 1.621 0 0 0-.1-1.247 1.585 1.585 0 0 0-1.154-.452Zm-3.791-2.35a2.526 2.526 0 0 0 .977 1.372 1.214 1.214 0 0 0 .963.063l2.135-3.66a1.065 1.065 0 0 0-.412-1.264 1.4 1.4 0 0 0-1.1-.281.751.751 0 0 0-.44.243c-.264.585-1.534 2.601-2.123 3.527Z" />
              <path d="M18.729 45.239a2.451 2.451 0 0 1-.7-.1c-1.713-.515-2.384-2.733-2.455-2.984a1 1 0 0 1 .093-.765 41.481 41.481 0 0 1 2.815-4.26 3.394 3.394 0 0 1 4.494-.807c.944.655 1.636 2.08.478 3.942a1 1 0 1 1-1.7-1.055c.257-.415.48-.966.081-1.243a1.384 1.384 0 0 0-1.769.382 39.431 39.431 0 0 0-2.435 3.64c.219.523.592 1.122.973 1.235.337.1.8-.246 1.051-.46a1 1 0 0 1 1.308 1.514 3.41 3.41 0 0 1-2.234.961Z" />
              <path d="M16.534 42.88a1 1 0 0 1-.323-.054c-.169-.057-4.155-1.45-4.155-4.572a1.012 1.012 0 0 1 .048-.309 11.688 11.688 0 0 1 1.473-2.8 3.105 3.105 0 0 1 3.848-.744 2.589 2.589 0 0 1 1.4 3.207c-.654 2.106-1.325 4.513-1.332 4.538a1 1 0 0 1-.963.731Zm-2.47-4.471c.1.936 1.058 1.648 1.826 2.075.261-.912.648-2.239 1.028-3.466a.6.6 0 0 0-.376-.82 1.2 1.2 0 0 0-1.329.1 10.356 10.356 0 0 0-1.149 2.111Z" />
              <path d="M13.877 37.529a1 1 0 0 1-.564-.175l-2.623-1.8a1 1 0 0 1 1.13-1.651l2.623 1.8a1 1 0 0 1-.566 1.826Z" />
            </g>
          </svg>
        </div>
        <span className="wj-nw-title">Real Networking</span>
        <div className="wj-nw-desc">
          <p>Connect with the global AWS Cloud Clubs community and build relationships that outlast college.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 5 ── */
function BuildCard({ expanded, onToggle }) {
  return (
    <div className="wj-bd-outer">
      <div
        className={`wj-bd-card${expanded ? ' wj-bd-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-bd-number">05</span>
        <div className="wj-bd-tools">
          <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <path d="M29.532 25.76l-5.655-5.655 0.754-0.754-0.754-0.754-2.261 2.261-3.771-3.77 4.53-4.532c0.603 0.215 1.234 0.324 1.882 0.324 1.493 0 2.897-0.582 3.954-1.637 1.63-1.631 2.092-4.054 1.178-6.174l-0.311-0.722-2.43 2.43-1.956 0.027 0.026-1.866 2.477-2.477-0.72-0.312c-0.706-0.306-1.457-0.461-2.229-0.461-1.494 0-2.897 0.582-3.952 1.637-1.546 1.545-2.043 3.802-1.311 5.84l-4.529 4.529-6.409-6.408 0.754-0.754-4.145-4.146-2.264 2.261 4.147 4.147 0.753-0.754 6.409 6.408-4.529 4.529c-0.605-0.217-1.239-0.326-1.888-0.326-1.493 0-2.897 0.582-3.953 1.637-1.633 1.632-2.095 4.059-1.176 6.181l0.312 0.72 2.477-2.477 1.865-0.025-0.027 1.956-2.43 2.43 0.722 0.311c0.704 0.303 1.452 0.458 2.221 0.458 1.494 0 2.897-0.581 3.952-1.636 1.544-1.544 2.041-3.799 1.314-5.833l4.532-4.532 3.771 3.769-2.263 2.263 0.754 0.754 0.754-0.754 5.654 5.654c0.503 0.504 1.174 0.781 1.885 0.781s1.381-0.277 1.885-0.781c1.039-1.039 1.039-2.73-0-3.769zM3.899 4.648l0.754-0.753 2.638 2.638-0.754 0.754-2.639-2.639zM11.448 22.456c0.739 1.716 0.364 3.679-0.955 4.999-0.854 0.854-1.989 1.324-3.198 1.324-0.347 0-0.689-0.039-1.021-0.116l1.569-1.569 0.047-3.485-3.394 0.046-1.619 1.619c-0.356-1.51 0.081-3.103 1.208-4.229 0.854-0.854 1.99-1.325 3.199-1.325 0.626 0 1.233 0.125 1.806 0.373l0.333 0.144 10.819-10.819-0.144-0.333c-0.744-1.719-0.37-3.682 0.952-5.004 0.854-0.854 1.99-1.325 3.198-1.325 0.35 0 0.695 0.040 1.030 0.117l-1.618 1.618-0.047 3.394 3.485-0.047 1.57-1.57c0.352 1.507-0.086 3.097-1.209 4.221-0.855 0.854-1.991 1.325-3.2 1.325-0.624 0-1.23-0.125-1.801-0.371l-0.332-0.143-10.821 10.823 0.143 0.332zM28.779 28.775c-0.302 0.302-0.704 0.469-1.131 0.469s-0.829-0.167-1.131-0.469l-5.654-5.654 2.262-2.262 5.655 5.655c0.624 0.624 0.624 1.638 0.001 2.261z" />
          </svg>
        </div>
        <span className="wj-bd-title">Build & Deploy</span>
        <div className="wj-bd-desc">
          <p>Work on actual cloud projects. Ship real things. Add AWS-powered work to your resume.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 6 ── */
function CertificationCard({ expanded, onToggle }) {
  return (
    <div className="wj-ct-outer">
      <div
        className={`wj-ct-card${expanded ? ' wj-ct-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-ct-number">06</span>
        <div className="wj-ct-cert">
          <svg viewBox="0 0 431.17 431.17" xmlns="http://www.w3.org/2000/svg">
            <g>
              <path d="M68.831,99.602h255.814c7.878,0,14.265-6.387,14.265-14.265c0-7.878-6.387-14.265-14.265-14.265H68.831 c-7.878,0-14.265,6.387-14.265,14.265C54.566,93.215,60.953,99.602,68.831,99.602z"/>
              <path d="M68.831,160.465h255.814c7.878,0,14.265-6.387,14.265-14.265c0-7.878-6.387-14.265-14.265-14.265H68.831 c-7.878,0-14.265,6.387-14.265,14.265C54.566,154.078,60.953,160.465,68.831,160.465z"/>
              <path d="M204.549,192.799H68.831c-7.878,0-14.265,6.387-14.265,14.265c0,7.878,6.387,14.265,14.265,14.265h135.718 c7.878,0,14.265-6.387,14.265-14.265C218.814,199.186,212.427,192.799,204.549,192.799z"/>
              <path d="M430.373,409.679l-37.295-73.843l14.431-5.759c3.79-1.513,6.97-5.888,7.24-9.96l1.229-18.516 c0.206-3.102,1.778-7.941,3.434-10.569l9.886-15.702c2.175-3.452,2.175-8.861,0.001-12.314l-9.887-15.702 c-1.654-2.628-3.227-7.469-3.433-10.569l-1.228-18.516c-0.232-3.486-2.6-7.188-5.652-9.132V37.438 c0-15.732-12.798-28.53-28.529-28.53H28.529C12.798,8.908,0,21.706,0,37.438v244.381c0,15.732,12.798,28.529,28.529,28.529h224.396 l0.648,9.77c0.271,4.072,3.45,8.446,7.24,9.959l13.549,5.407l-37.474,74.195c-1.153,2.284-0.844,3.66-0.381,4.412 c0.293,0.477,1.011,1.275,2.523,1.275c0.756,0,1.627-0.204,2.589-0.606l30.697-12.852c0.755-0.316,1.653-0.483,2.597-0.483 c2.255,0,4.553,0.933,5.854,2.374l14.746,16.349c1.229,1.363,2.751,2.114,4.283,2.114c2.022,0,3.836-1.307,4.85-3.494l28.89-62.32 c0.063-0.001,0.125-0.001,0.188-0.002l28.891,62.322c1.014,2.188,2.827,3.494,4.851,3.494c1.531,0,3.053-0.751,4.282-2.115 l14.745-16.347c1.302-1.442,3.6-2.375,5.854-2.375c0.943,0,1.842,0.167,2.597,0.483l30.697,12.852 c0.962,0.402,1.833,0.606,2.589,0.606c1.513,0,2.23-0.799,2.523-1.275C431.217,413.339,431.526,411.963,430.373,409.679z M28.529,37.438h352.039l0.002,156.56l-11.152-13.417c-2.036-2.449-5.764-4.094-9.275-4.094c-0.855,0-1.673,0.098-2.433,0.291 l-17.998,4.581c-2.867,0.729-8.236,0.729-11.104,0l-17.996-4.581c-0.76-0.193-1.578-0.291-2.433-0.291 c-3.512,0-7.239,1.645-9.275,4.094l-11.866,14.277c-1.984,2.389-6.099,5.379-8.983,6.53l-17.24,6.882 c-3.791,1.513-6.971,5.887-7.241,9.959l-1.229,18.516c-0.205,3.102-1.777,7.941-3.433,10.569l-9.886,15.702 c-2.175,3.452-2.175,8.862,0,12.314l4.085,6.488H28.529V37.438z M334.16,329.825c-33.497,0-60.652-27.154-60.652-60.652 c0-33.498,27.155-60.652,60.652-60.652c33.498,0,60.654,27.154,60.654,60.652C394.815,302.671,367.658,329.825,334.16,329.825z"/>
            </g>
          </svg>
        </div>
        <span className="wj-ct-title">Certification Track</span>
        <div className="wj-ct-desc">
          <p>Structured learning paths toward AWS certifications. Go from zero to certified with club support.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Special interactive Card 7 ── */
function CommunityCard({ expanded, onToggle }) {
  return (
    <div className="wj-cd-outer">
      <div
        className={`wj-cd-card${expanded ? ' wj-cd-expanded' : ''}`}
        onClick={onToggle}
      >
        <span className="wj-cd-number">07</span>
        <div className="wj-cd-globe">
          <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <path d="M32,0C14.327,0,0,14.327,0,32s14.327,32,32,32s32-14.327,32-32S49.673,0,32,0z M49.972,31 c-0.138-5.582-1.414-10.878-3.613-15.667c2.652-1.022,5.169-2.317,7.515-3.854c4.824,5.14,7.854,11.976,8.102,19.521H49.972z M33.333,61.966c-0.11,0.005-0.222,0.005-0.333,0.009V50.035c3.324,0.087,6.547,0.581,9.605,1.47 C40.184,55.541,37.029,59.084,33.333,61.966z M44.549,52.141c2.283,0.801,4.462,1.817,6.523,3.018 c-3.991,3.29-8.849,5.563-14.178,6.438C39.902,58.861,42.484,55.672,44.549,52.141z M21.394,51.505 c3.059-0.89,6.282-1.383,9.606-1.47v11.939c-0.111-0.004-0.223-0.004-0.333-0.009C26.97,59.084,23.816,55.541,21.394,51.505z M27.105,61.596c-5.329-0.874-10.187-3.147-14.178-6.438c2.062-1.2,4.24-2.217,6.523-3.017 C21.515,55.672,24.098,58.861,27.105,61.596z M2.025,31c0.248-7.545,3.277-14.381,8.102-19.521c2.346,1.536,4.862,2.831,7.515,3.854 C15.442,20.122,14.166,25.418,14.028,31H2.025z M43.57,14.196c-3.345,1.069-6.894,1.67-10.57,1.766V2.025 c0.111,0.004,0.223,0.004,0.333,0.009C37.541,5.314,41.047,9.453,43.57,14.196z M36.895,2.404 c5.944,0.976,11.298,3.696,15.521,7.622c-2.176,1.391-4.496,2.57-6.944,3.499C43.278,9.326,40.369,5.562,36.895,2.404z M31,2.025 v13.937c-3.677-0.096-7.226-0.696-10.57-1.766c2.523-4.743,6.029-8.882,10.237-12.162C30.777,2.029,30.889,2.029,31,2.025z M18.529,13.525c-2.448-0.929-4.769-2.108-6.944-3.499c4.223-3.926,9.576-6.646,15.521-7.622 C23.631,5.562,20.722,9.326,18.529,13.525z M19.532,16.009c3.622,1.189,7.472,1.873,11.468,1.972V31H16.031 C16.17,25.654,17.403,20.584,19.532,16.009z M31,33v15.036c-3.684,0.092-7.245,0.665-10.615,1.689 C17.732,44.712,16.188,39.029,16.031,33H31z M33,48.036V33h14.969c-0.156,6.029-1.701,11.712-4.354,16.726 C40.245,48.701,36.684,48.128,33,48.036z M33,31V17.98c3.996-0.099,7.846-0.782,11.468-1.972c2.129,4.575,3.362,9.646,3.501,14.991 H33z M2.025,33h12.003c0.154,6.253,1.74,12.146,4.447,17.369c-2.496,0.899-4.871,2.044-7.109,3.396 C5.827,48.513,2.294,41.172,2.025,33z M52.634,53.766c-2.238-1.353-4.613-2.497-7.109-3.396c2.707-5.224,4.293-11.116,4.447-17.369 h12.003C61.706,41.172,58.173,48.513,52.634,53.766z" />
          </svg>
        </div>
        <span className="wj-cd-title">Community Day</span>
        <div className="wj-cd-desc">
          <p>Participate in AWS Student Community Day — a large-scale student-led event with clubs nationwide.</p>
        </div>
      </div>
    </div>
  );
}

export default function WhyJoinUs() {
  const [activeCard, setActiveCard] = useState(null);
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftPos = useRef(0);
  const SCROLL_AMOUNT = 256;

  const handleScrollLeft = useCallback(() => { scrollRef.current?.scrollBy({ left: -SCROLL_AMOUNT, behavior: 'smooth' }); }, []);
  const handleScrollRight = useCallback(() => { scrollRef.current?.scrollBy({ left: SCROLL_AMOUNT, behavior: 'smooth' }); }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      // If scrolling down and already at the end, or scrolling up and already at the start, let page scroll
      if ((e.deltaY > 0 && atEnd) || (e.deltaY < 0 && atStart)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);




  const onMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeftPos.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = useCallback((e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeftPos.current - (x - startX.current) * 1.2;
  }, []);
  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) { scrollRef.current.style.cursor = 'grab'; }
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    return () => { document.removeEventListener('mouseup', onMouseUp); document.removeEventListener('mousemove', onMouseMove); };
  }, [onMouseUp, onMouseMove]);

  return (
    <>
      <style>{`
        /* ── Scroll infrastructure ── */
        .wj-scroll-wrapper{position:relative}
        .wj-scroll-wrapper::after{content:'';position:absolute;right:0;top:0;height:100%;width:80px;background:linear-gradient(to right,transparent,var(--color-background));pointer-events:none;z-index:2}
        .wj-scroll-track{scrollbar-width:none;-ms-overflow-style:none}
        .wj-scroll-track::-webkit-scrollbar{display:none}

        /* ── Regular cards hover ── */
        .wj-card{transition:all .3s ease}
        .wj-card:hover{border-color:rgba(255,153,0,.5)!important;box-shadow:0 0 20px rgba(255,153,0,.2);transform:translateY(-4px)}
        .wj-card::after{content:'';position:absolute;bottom:8px;right:8px;width:10px;height:10px;border-right:1px solid rgba(255,153,0,.4);border-bottom:1px solid rgba(255,153,0,.4);pointer-events:none}
        .wj-nav-btn{transition:background .2s ease}
        .wj-nav-btn:hover{background:rgba(255,153,0,.1)}

        /* ══════════════════════════════════════
           Workshop Card 1 — Interactive
           ══════════════════════════════════════ */
        .wj-ws-outer{flex-shrink:0}
        .wj-ws-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 01 label — */
        .wj-ws-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ws-card:hover .wj-ws-number{-webkit-text-stroke-color:#FF9900}
        .wj-ws-expanded .wj-ws-number{
          opacity:0;pointer-events:none;
        }

        /* — Cloud SVG — */
        .wj-ws-cloud{
          position:absolute;bottom:0;left:0;width:100%;z-index:2;
          transform-origin:bottom center;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ws-cloud svg{display:block;width:100%}
        .wj-ws-cloud path{fill:none;stroke:#7A5230;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round;transition:stroke .3s ease}
        .wj-ws-card:hover .wj-ws-cloud{transform:scale(1.02)}
        .wj-ws-card:hover .wj-ws-cloud path{stroke:#FF9900}
        .wj-ws-expanded .wj-ws-cloud{bottom:155px}
        .wj-ws-expanded .wj-ws-cloud path{stroke:#FF9900}

        /* — Title text — */
        .wj-ws-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ws-expanded .wj-ws-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-ws-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-ws-expanded .wj-ws-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-ws-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Credits Card 2 — Interactive
           ══════════════════════════════════════ */
        .wj-cr-outer{flex-shrink:0}
        .wj-cr-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 02 label (z-index 5, always in front of ribbons) — */
        .wj-cr-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cr-card:hover .wj-cr-number{-webkit-text-stroke-color:#FF9900}
        .wj-cr-expanded .wj-cr-number{opacity:0;pointer-events:none}

        /* — Award icon (at center, moves up on expand) — */
        .wj-cr-award{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%,-50%);
          width:117px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cr-award svg{display:block;width:100%;height:auto}
        .wj-cr-award path, .wj-cr-award polygon, .wj-cr-award circle, .wj-cr-award line{
          fill:none;stroke:#7A5230;stroke-width:1.5;
          stroke-linecap:round;stroke-linejoin:round;
          transition:stroke .3s ease;
        }
        .wj-cr-card:hover .wj-cr-award path,
        .wj-cr-card:hover .wj-cr-award polygon,
        .wj-cr-card:hover .wj-cr-award circle,
        .wj-cr-card:hover .wj-cr-award line{stroke:#FF9900}
        .wj-cr-card:hover .wj-cr-award{transform:translate(-50%,-50%) scale(1.05)}
        .wj-cr-expanded .wj-cr-award{top:46%;transform:translate(-50%,-50%) scale(0.75)}
        .wj-cr-expanded .wj-cr-award path,
        .wj-cr-expanded .wj-cr-award polygon,
        .wj-cr-expanded .wj-cr-award circle,
        .wj-cr-expanded .wj-cr-award line{stroke:#FF9900}

        /* — Title text — */
        .wj-cr-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cr-expanded .wj-cr-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-cr-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-cr-expanded .wj-cr-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-cr-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Speaker Card 3 — Interactive
           ══════════════════════════════════════ */
        .wj-sp-outer{flex-shrink:0}
        .wj-sp-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 03 label — */
        .wj-sp-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-sp-card:hover .wj-sp-number{-webkit-text-stroke-color:#FF9900}
        .wj-sp-expanded .wj-sp-number{opacity:0;pointer-events:none}

        /* — Mic SVG — */
        .wj-sp-mic{
          position:absolute;top:50%;left:50%;
          transform:translate(-54%, -50%);
          width:220px;height:220px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-sp-mic svg{display:block;width:100%;height:100%}
        .wj-sp-mic rect, .wj-sp-mic ellipse, .wj-sp-mic line{
          fill:none;stroke:#7A5230;stroke-width:1.5;
          stroke-linecap:round;stroke-linejoin:round;
          transition:stroke .3s ease;
        }
        .wj-sp-card:hover .wj-sp-mic rect,
        .wj-sp-card:hover .wj-sp-mic ellipse,
        .wj-sp-card:hover .wj-sp-mic line{stroke:#FF9900}
        .wj-sp-card:hover .wj-sp-mic{transform:translate(-54%, -50%) scale(1.03)}
        .wj-sp-expanded .wj-sp-mic{top:38%;transform:translate(-54%, -50%) scale(0.85)}
        .wj-sp-expanded .wj-sp-mic rect,
        .wj-sp-expanded .wj-sp-mic ellipse,
        .wj-sp-expanded .wj-sp-mic line{stroke:#FF9900}

        /* — Title text — */
        .wj-sp-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-sp-expanded .wj-sp-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-sp-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-sp-expanded .wj-sp-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-sp-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Networking Card 4 — Interactive
           ══════════════════════════════════════ */
        .wj-nw-outer{flex-shrink:0}
        .wj-nw-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 04 label — */
        .wj-nw-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-nw-card:hover .wj-nw-number{-webkit-text-stroke-color:#FF9900}
        .wj-nw-expanded .wj-nw-number{opacity:0;pointer-events:none}

        /* — Handshake SVG — */
        .wj-nw-handshake{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%, -50%);
          width:180px;height:180px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-nw-handshake svg{display:block;width:100%;height:100%}
        .wj-nw-handshake path{
          fill:#7A5230;
          transition:fill .3s ease;
        }
        .wj-nw-card:hover .wj-nw-handshake path{fill:#FF9900}
        .wj-nw-card:hover .wj-nw-handshake{transform:translate(-50%, -50%) scale(1.05)}
        .wj-nw-expanded .wj-nw-handshake{top:42%;transform:translate(-50%, -50%) scale(0.85)}
        .wj-nw-expanded .wj-nw-handshake path{fill:#FF9900}

        /* — Title text — */
        .wj-nw-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-nw-expanded .wj-nw-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-nw-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-nw-expanded .wj-nw-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-nw-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Build Card 5 — Interactive
           ══════════════════════════════════════ */
        .wj-bd-outer{flex-shrink:0}
        .wj-bd-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 05 label — */
        .wj-bd-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-bd-card:hover .wj-bd-number{-webkit-text-stroke-color:#FF9900}
        .wj-bd-expanded .wj-bd-number{opacity:0;pointer-events:none}

        /* — Tools SVG — */
        .wj-bd-tools{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%, -50%);
          width:160px;height:160px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-bd-tools svg{display:block;width:100%;height:100%}
        .wj-bd-tools path{
          fill:#7A5230;
          transition:fill .3s ease;
        }
        .wj-bd-card:hover .wj-bd-tools path{fill:#FF9900}
        .wj-bd-card:hover .wj-bd-tools{transform:translate(-50%, -50%) scale(1.05)}
        .wj-bd-expanded .wj-bd-tools{top:36%;transform:translate(-50%, -50%) scale(0.75)}
        .wj-bd-expanded .wj-bd-tools path{fill:#FF9900}

        /* — Title text — */
        .wj-bd-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-bd-expanded .wj-bd-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-bd-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-bd-expanded .wj-bd-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-bd-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Certification Card 6 — Interactive
           ══════════════════════════════════════ */
        .wj-ct-outer{flex-shrink:0}
        .wj-ct-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 06 label — */
        .wj-ct-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ct-card:hover .wj-ct-number{-webkit-text-stroke-color:#FF9900}
        .wj-ct-expanded .wj-ct-number{opacity:0;pointer-events:none}

        /* — Cert SVG — */
        .wj-ct-cert{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%, -50%);
          width:160px;height:160px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ct-cert svg{display:block;width:100%;height:100%}
        .wj-ct-cert path{
          fill:#7A5230;
          transition:fill .3s ease;
        }
        .wj-ct-card:hover .wj-ct-cert path{fill:#FF9900}
        .wj-ct-card:hover .wj-ct-cert{transform:translate(-50%, -50%) scale(1.05)}
        .wj-ct-expanded .wj-ct-cert{top:46%;transform:translate(-50%, -50%) scale(0.75)}
        .wj-ct-expanded .wj-ct-cert path{fill:#FF9900}

        /* — Title text — */
        .wj-ct-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-ct-expanded .wj-ct-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-ct-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-ct-expanded .wj-ct-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-ct-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}

        /* ══════════════════════════════════════
           Community Card 7 — Interactive
           ══════════════════════════════════════ */
        .wj-cd-outer{flex-shrink:0}
        .wj-cd-card{
          position:relative;width:280px;min-width:280px;height:340px;
          background:transparent;
          border:1.5px solid #C8A882;border-radius:14px;
          overflow:hidden;cursor:pointer;flex-shrink:0;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }

        /* — 07 label — */
        .wj-cd-number{
          position:absolute;top:18px;left:20px;
          font-family:'Inter',sans-serif;font-size:40px;font-weight:900;
          color:transparent;-webkit-text-stroke:2.5px #fff;
          z-index:5;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cd-card:hover .wj-cd-number{-webkit-text-stroke-color:#FF9900}
        .wj-cd-expanded .wj-cd-number{opacity:0;pointer-events:none}

        /* — Globe SVG — */
        .wj-cd-globe{
          position:absolute;top:50%;left:50%;
          transform:translate(-50%, -50%);
          width:160px;height:160px;z-index:2;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cd-globe svg{display:block;width:100%;height:100%}
        .wj-cd-globe path{
          fill:#7A5230;
          transition:fill .3s ease;
        }
        .wj-cd-card:hover .wj-cd-globe path{fill:#FF9900}
        .wj-cd-card:hover .wj-cd-globe{transform:translate(-50%, -50%) scale(1.05)}
        .wj-cd-expanded .wj-cd-globe{top:36%;transform:translate(-50%, -50%) scale(0.75)}
        .wj-cd-expanded .wj-cd-globe path{fill:#FF9900}

        /* — Title text — */
        .wj-cd-title{
          position:absolute;top:calc(100% - 38px);left:50%;transform:translateX(-50%);
          font-family:'Courier New',monospace;font-size:14px;font-weight:800;
          text-transform:uppercase;letter-spacing:1.5px;white-space:nowrap;
          color:#fff;
          z-index:3;
          transition:all .65s cubic-bezier(.4,0,.2,1);
        }
        .wj-cd-expanded .wj-cd-title{top:18px;font-size:12px;letter-spacing:2px;color:#5A3A1A}

        /* — Description (expand only) — */
        .wj-cd-desc{
          position:absolute;bottom:16px;left:0;right:0;
          padding:0 22px;
          background:transparent;
          z-index:4;opacity:0;transform:translateY(10px);
          transition:opacity .4s ease 0s,transform .4s ease 0s;
        }
        .wj-cd-expanded .wj-cd-desc{opacity:1;transform:translateY(0);transition:opacity .4s ease .4s,transform .4s ease .4s}
        .wj-cd-desc p{font-family:'Courier New',monospace;font-size:13px;color:#dbc2ad;line-height:1.6;text-align:center;margin:0}



      `}</style>

      <section id="why-join-us" className="relative py-24 px-container-padding bg-background border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage:'linear-gradient(rgba(255,153,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,153,0,0.04) 1px,transparent 1px)', backgroundSize:'40px 40px' }} />

        <div className="w-full relative z-10">
          {/* Header */}
          <div className="flex justify-between items-start mb-16">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-block w-3 h-3 bg-primary-container flex-shrink-0" />
                <span className="font-label-sm text-[11px] tracking-[0.15em] text-primary-container uppercase leading-none">CORE BENEFITS</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-white uppercase tracking-widest leading-tight m-0 mb-2">WHY JOIN US?</h2>
              <p className="font-body-md text-body-md text-outline m-0">Everything you need to accelerate your cloud career.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0 mt-1">
              <button className="wj-nav-btn w-9 h-9 bg-transparent border border-primary-container/40 text-primary-container font-headline-md text-base cursor-pointer flex items-center justify-center rounded-sm p-0 leading-none" aria-label="Scroll left" onClick={handleScrollLeft}>←</button>
              <button className="wj-nav-btn w-9 h-9 bg-transparent border border-primary-container/40 text-primary-container font-headline-md text-base cursor-pointer flex items-center justify-center rounded-sm p-0 leading-none" aria-label="Scroll right" onClick={handleScrollRight}>→</button>
            </div>
          </div>

          {/* Carousel */}
          <div className="wj-scroll-wrapper">
            <div className="wj-scroll-track flex gap-4 items-start overflow-x-auto cursor-grab pb-1" style={{ WebkitOverflowScrolling:'touch' }} ref={scrollRef} onMouseDown={onMouseDown}>
              {/* Card 1 — Special interactive workshop card */}
              <WorkshopCard expanded={activeCard === 1} onToggle={() => setActiveCard(activeCard === 1 ? null : 1)} />
              {/* Card 2 — Special interactive credits card */}
              <CreditsCard expanded={activeCard === 2} onToggle={() => setActiveCard(activeCard === 2 ? null : 2)} />
              {/* Card 3 — Special interactive speaker card */}
              <SpeakerCard expanded={activeCard === 3} onToggle={() => setActiveCard(activeCard === 3 ? null : 3)} />
              {/* Card 4 — Special interactive networking card */}
              <NetworkingCard expanded={activeCard === 4} onToggle={() => setActiveCard(activeCard === 4 ? null : 4)} />
              {/* Card 5 — Special interactive build card */}
              <BuildCard expanded={activeCard === 5} onToggle={() => setActiveCard(activeCard === 5 ? null : 5)} />
              {/* Card 6 — Special interactive certification card */}
              <CertificationCard expanded={activeCard === 6} onToggle={() => setActiveCard(activeCard === 6 ? null : 6)} />
              {/* Card 7 — Special interactive community card */}
              <CommunityCard expanded={activeCard === 7} onToggle={() => setActiveCard(activeCard === 7 ? null : 7)} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

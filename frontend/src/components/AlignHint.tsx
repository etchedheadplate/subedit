import "../styles/AlignHint.css";

// Example table
const alignHint = (
    <div className="example-hint">
        <div className="example-table">
            <table>
                <thead>
                    <tr>
                        <th>source</th>
                        <th>example</th>
                        <th>aligned</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <div>1</div>
                            <div>00:00:13,000 --&gt; 00:00:19,348</div>
                            <div>Teshigahara Productions -<br></br>Tokyo Eiga Co. Co-production</div>
                        </td>
                        <td>
                            <div>1</div>
                            <div>00:00:21,254 --&gt; 00:00:25,918</div>
                            <div>A TOHO RELEASE</div>
                        </td>
                        <td>
                            <div>1</div>
                            <div className="wrong-timing">00:00:13,000 --&gt; 00:00:19,348</div>
                            <div>Teshigahara Productions -<br></br>Tokyo Eiga Co. Co-production</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="source-index">2</div>
                            <div>00:00:22,120 --&gt; 00:00:23,519</div>
                            <div className="matching-text">These objects.</div>
                        </td>
                        <td>
                            <div>2</div>
                            <div>00:00:34,000 --&gt; 00:00:40,462</div>
                            <div>A TESHIGAHARA PRODUCTIONS...<br></br>- TOKYO EIGA COPRODUCTION</div>
                        </td>
                        <td>
                            <div className="source-index">2</div>
                            <div className="example-timing">00:00:43,777 --&gt; 00:00:45,235</div>
                            <div className="matching-text">These objects.</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>3</div>
                            <div>00:00:25,360 --&gt; 00:00:26,952</div>
                            <div>Any idea what they are?</div>
                        </td>
                        <td>
                            <div className="example-index">3</div>
                            <div className="example-timing">00:00:43,777 --&gt; 00:00:45,972</div>
                            <div className="matching-text">Recognize these?</div>
                        </td>
                        <td>
                            <div>3</div>
                            <div>00:00:47,155 --&gt; 00:00:48,815</div>
                            <div>Any idea what they are?</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>...</div>
                        </td>
                        <td>
                            <div>4</div>
                            <div>00:00:47,080 --&gt; 00:00:49,048</div>
                            <div>You know what they are?</div>
                        </td>
                        <td>
                            <div className="skip-subtitle">...</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="skip-subtitle">...</div>
                        </td>
                        <td>
                            <div className="skip-subtitle">...</div>
                        </td>
                        <td>
                            <div className="skip-subtitle">...</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>1027</div>
                            <div>01:55:04,280 --&gt; 01:55:05,918</div>
                            <div>Thanks.</div>
                        </td>
                        <td>
                            <div>1044</div>
                            <div>02:00:20,479 --&gt; 02:00:22,140</div>
                            <div>Thank you.</div>
                        </td>
                        <td>
                            <div>1027</div>
                            <div>02:00:19,787 --&gt; 02:00:21,495</div>
                            <div>Thanks.</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div className="source-index">1028</div>
                            <div>01:55:07,000 --&gt; 01:55:09,355</div>
                            <div className="matching-text">I will.</div>
                        </td>
                        <td>
                            <div className="example-index">1045</div>
                            <div className="example-timing">02:00:23,282 --&gt; 02:00:25,079</div>
                            <div className="matching-text">I will.</div>
                        </td>
                        <td>
                            <div className="source-index">1028</div>
                            <div className="example-timing">02:00:22,623 --&gt; 02:00:25,079</div>
                            <div className="matching-text">I will.</div>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            <div>1029</div>
                            <div>01:56:35,480 --&gt; 01:56:40,429</div>
                            <div>© Copyright, 1966 by<br></br>Teshigahara Productions</div>
                        </td>
                        <td>
                            <div>1046</div>
                            <div>02:01:47,867 --&gt; 02:01:51,030</div>
                            <div>THE END</div>
                        </td>
                        <td>
                            <div>1029</div>
                            <div className="wrong-timing">01:56:35,480 --&gt; 01:56:40,429</div>
                            <div>© Copyright, 1966 by<br></br>Teshigahara Productions</div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p>
            After uploading both files, look for <span className="matching-text">matching lines</span> at the beginning and end. It can also help to
            review the neighboring lines — in the case above the line <i>Any idea what they are?</i> increases confidence in the match. Next, enter the
            corresponding <span className="source-index">source indices</span> and <span className="example-index">example indices</span> into
            the form fields below, then press the <b>Align</b> button. You’ll see that the <span className="example-timing">example timing</span> is
            correctly mapped to the source. Optionally, you can trim subtitles that fall outside the source range, as they are
            likely to have <span className="wrong-timing">incorrect timing</span> now.
        </p>
    </div>
);

export default alignHint;

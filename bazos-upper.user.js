// ==UserScript==
// @name         Bazos upper
// @version      1.2
// @downloadURL  https://github.com/jankocian/userjs-bazos-upper/raw/main/bazos-upper.user.js
// @author       Jan Kocian
// @match        https://*.bazos.cz/inzerat/*
// @match        https://*.bazos.cz/pridat-inzerat.php
// @match        https://*.bazos.cz/moje-inzeraty.php
// @match        https://*.bazos.cz/insert.php
// @require      https://code.jquery.com/jquery-1.12.4.min.js

// ==/UserScript==


// ToDo:
// - turn on upperAll based on GET variable (so that it can be bookmarked)
// - add a random delay as a safety feature (multiplier to be configured at the top of the script)

// Done:
// - fix for one-image (and no-image) ads


// v2:
// - upload to sbazar
// - sbazar upper (refactoring to reuse majority of the code)

(function() {
    'use strict';

    /*** HELPER FUNCTIONS ***/
    const getAdData = () => {
        return {
            section: document.querySelector('select[name="rubriky"] option[selected]').value,
            category: document.querySelector('link[type="application/rss+xml"]').href.split('cat=')[1],
            title: document.querySelector('.nadpisdetail').innerText,
            content: document.querySelector('.popisdetail').innerText.replaceAll(';', '%3B'),
            price: document.querySelector('.listadvlevo table tr:last-child td:last-child b').innerText.slice(0,-3).replaceAll(' ', ''),
            zip: document.querySelector('a[title="Přibližná lokalita"]').innerText.replaceAll(' ', ''),
            images: Array.from(document.querySelectorAll('.carousel-cell-image')).map((el) => {
                return el.src || el.getAttribute('data-flickity-lazyload');
            })
        }
    }

    const getAds = () => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; upperAds=`);

        if (parts.length === 2) return JSON.parse(parts.pop().split(';').shift());
        return [];
    }

    const saveAds = (ads) => {
        let expires = new Date();
        expires.setMonth(expires.getMonth() + 12);
        document.cookie = 'upperAds=' + JSON.stringify(ads) + ';expires=' + expires + '; domain=.bazos.cz;path=/';
    }

    const addAd = (ad) => {
        let ads = getAds();
        ads.push(ad);
        saveAds(ads);
    }


    /*** All pages ***/

    const saveAllBtn = document.createElement("a");
    saveAllBtn.innerText = 'Upper Up All';
    saveAllBtn.href = '#';
    saveAllBtn.style.marginRight = '20px';
    saveAllBtn.style.fontWeight = 'bold';

    const value = `; ${document.cookie}`;
    const parts = value.split(`; upperAll=`);

    if (parts.length === 2) {
        saveAllBtn.style.color = 'red';
        saveAllBtn.innerText = 'Vypnout Upper Up';
    }

    saveAllBtn.addEventListener('click', (e) => {
        e.preventDefault();

        const value = `; ${document.cookie}`;
        const parts = value.split(`; upperAll=`);

        if (parts.length === 2) {
           document.cookie = 'upperAll=; Max-Age=-99999999; domain=.bazos.cz;path=/';

        } else {
            let expires = new Date();
            expires.setMonth(expires.getMonth() + 12);
            document.cookie = 'upperAll=true;expires=' + expires + '; domain=.bazos.cz;path=/';
            window.location.assign('https://auto.bazos.cz/moje-inzeraty.php');
        }

        window.location.reload();
    });

    document.querySelector('.listalogop').appendChild(saveAllBtn);


    /*** MY ADS page ***/
    if (location.href.indexOf('/moje-inzeraty.php') > -1 || location.href.indexOf('/insert.php') > -1) {


        // If upperAll active
        const value = `; ${document.cookie}`;
        const parts = value.split(`; upperAll=`);

        if (parts.length === 2) {
            let upperAllDone = true;
            //document.querySelectorAll('.vypis tr:first-child td:first-child').forEach((el) => {

            document.querySelectorAll('.inzeraty').forEach((el) => {
                const date = el.querySelector('.velikost10').innerText.replaceAll(' - [', '').replaceAll(']', '').replaceAll(' ', '');

                let today = new Date();
                today = String(today.getDate()) + '.' + String(today.getMonth()+1) + '.' + today.getFullYear();

                const url = el.querySelector('a').href;

                if (date !== today) {
                    upperAllDone = false;
                    window.location.assign(url);
                }
            });

            // All updated, disable autoUpdater
            if (upperAllDone) {
                document.cookie = 'upperAll=; Max-Age=-99999999; domain=.bazos.cz;path=/';
                window.location.reload();
            }
        }
    }

    /*** SINGLE AD page ***/
    if (location.href.indexOf('/inzerat/') > -1) {
        const saveAdBtn = document.createElement("a");
        saveAdBtn.appendChild(document.createTextNode("Upper Up"));
        saveAdBtn.href = '#';
        saveAdBtn.style.marginLeft = '20px';
        saveAdBtn.style.fontWeight = 'bold';

        saveAdBtn.addEventListener('click', (e) => {
            e.preventDefault();

            const newAd = getAdData();
            addAd(newAd);

            window.location.assign('https://auto.bazos.cz/pridat-inzerat.php');
        });

        document.querySelector('.listainzerat div:last-child').appendChild(saveAdBtn);

        // If upperAll active
        const value = `; ${document.cookie}`;
        const parts = value.split(`; upperAll=`);

        if (parts.length === 2) {
            const newAd = getAdData();
            addAd(newAd);

            window.location.assign('https://auto.bazos.cz/pridat-inzerat.php');
        }
    }


    /*** ADD an AD page ***/
    if (location.href.indexOf('/pridat-inzerat.php') > -1) {
        let ads = getAds();

        if (ads.length > 0) {
            const ad = ads.pop();

            if (document.querySelector('select[name="rubrikyvybrat"]').value !== ad.section) {
                document.querySelector('select[name="rubrikyvybrat"]').value = ad.section;
                document.querySelector('select[name="rubrikyvybrat"]').dispatchEvent(new Event("change"));

            } else {
                document.querySelector('select#category').value = ad.category;
                document.querySelector('input#nadpis').value = ad.title;
                document.querySelector('textarea#popis').innerHTML = ad.content;
                document.querySelector('input#cena').value = ad.price;
                document.querySelector('input#lokalita').value = ad.zip;

                const imagesFetch = [];

                ad.images.forEach((url, index) => {
                    // Solution based on https://bytes.com/topic/javascript/answers/960202-dropzone-js-add-file-queue-without-file-browser-dialouge
                    // using my PHP proxy to overcome CORS (free, public, but limited alternative https://cors-anywhere.herokuapp.com)
                    imagesFetch[index] = fetch('https://utils.jankocian.com/cors/?url=' + url)
                                         .then(response => response.arrayBuffer());
                });

                Promise.all(imagesFetch)
                .then(responses => {
                    responses.forEach((arrayBuffer, index) => {
                        const blob = new Blob( [ arrayBuffer ], { type: 'image/jpeg' } );
                        const parts = [blob, new ArrayBuffer()];

                        const file = new File(parts, `${index}`, {
                            lastModified: new Date(0), // optional - default = now
                            type: "image/jpeg"
                        });

                        myDropzone.addFile(file);
                    })
                });

                myDropzone.on('queuecomplete', function() {
                    document.querySelector('input[value="Odeslat"]').click();
                });

                saveAds(ads);
            }
        }
    }
})();

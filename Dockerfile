FROM node:16.8.0-alpine3.14 as builder

RUN mkdir /empty
RUN apk add --no-cache binutils gcc g++ python3 make linux-headers

RUN npm install -g caxa
COPY ./cli /usr/local/defasm/cli

RUN caxa -i /usr/local/defasm/cli -o /usr/bin/defasm -- \
    "{{caxa}}/node_modules/.bin/node" "{{caxa}}/main.js"

FROM scratch

COPY --from=0 /lib/ld-musl-x86_64.so.1    /lib/libz.so.1 /lib/
COPY --from=0 /empty                      /proc
COPY --from=0 /empty                      /tmp
COPY --from=0 /usr/bin/defasm /usr/bin/ld /usr/bin/
COPY --from=0 \
        /usr/lib/libstdc++.so \
        /usr/lib/libstdc++.so.6.0.28 \
        /usr/lib/libstdc++.so.6 \
        /usr/lib/libgcc_s.so.1 \
        /usr/lib/libbfd-2.35.2.so \
        /usr/lib/libctf.so.0 \
            /usr/lib/

ENTRYPOINT [ "/usr/bin/defasm" ]
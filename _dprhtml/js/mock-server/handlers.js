import { readFile } from "node:fs";
import { join } from "node:path";
import { rest } from "msw";

const PROJECT_ROOT_DIRECTORY = process.cwd();

export default [
	rest.get(
		"/tipitaka/**/*.xml",
		({ url }, res, ctx) =>
			new Promise((resolve, reject) => {
				const xmlFilepath = join(PROJECT_ROOT_DIRECTORY, url.pathname);
				readFile(xmlFilepath, (error, buffer) => {
					if (error) {
						reject(error);
						return;
					}

					resolve(res(ctx.xml(buffer.toString())));
				});
			}),
	),
];

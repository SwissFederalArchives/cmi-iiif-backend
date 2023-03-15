# cmi-iiif-backend

- [cmi-viaduc](https://github.com/SwissFederalArchives/cmi-viaduc)
  - [cmi-viaduc-web-core](https://github.com/SwissFederalArchives/cmi-viaduc-web-core)
  - [cmi-viaduc-web-frontend](https://github.com/SwissFederalArchives/cmi-viaduc-web-frontend)
  - [cmi-viaduc-web-management](https://github.com/SwissFederalArchives/cmi-viaduc-web-management)
  - [cmi-viaduc-backend](https://github.com/SwissFederalArchives/cmi-viaduc-backend)
  - [cmi-iiif-frontend](https://github.com/SwissFederalArchives/cmi-iiif-frontend)
  - **[cmi-iiif-backend](https://github.com/SwissFederalArchives/cmi-iiif-backend)** :triangular_flag_on_post:

# Context

The [Viaduc](https://github.com/SwissFederalArchives/cmi-viaduc) project includes 6 code repositories. This current repository `cmi-iiif-backend` is the backend that provides IIIF related services. These services are consumed by the actual _IIIF-Viewer_ ([cmi-iiif-frontend](https://github.com/SwissFederalArchives/cmi-iiif-frontend)). 
The other repositories include the applications _public access_ ([cmi-viaduc-web-frontend](https://github.com/SwissFederalArchives/cmi-viaduc-web-frontend)) and the _internal management_ ([cmi-viaduc-web-management](https://github.com/SwissFederalArchives/cmi-viaduc-web-management));  both are Angular applications that access basic services of another Angular library called [cmi-viaduc-web-core](https://github.com/SwissFederalArchives/cmi-viaduc-web-core). The Angular applications are hosted in an `ASP.NET` container (see backend repository [cmi-viaduc-backend](https://github.com/SwissFederalArchives/cmi-viaduc-backend)) and communicate with the system via web API.

![The Big-Picture](docs/imgs/context.svg)

> Note: A general description of the repositories can be found in the repository [cmi-viaduc](https://github.com/SwissFederalArchives/cmi-viaduc).


# Authors

- [4eyes GmbH](https://www.4eyes.ch/)
- [CM Informatik AG](https://cmiag.ch)
- [Evelix GmbH](https://evelix.ch)

# License

GNU Affero General Public License (AGPLv3), see [LICENSE](LICENSE.TXT)

# Contribute

This repository is a copy which is updated regularly - therefore contributions via pull requests are not possible. However, independent copies (forks) are possible under consideration of the AGPLV3 license.

# Contact

- For general questions (and technical support), please contact the Swiss Federal Archives by e-mail at bundesarchiv@bar.admin.ch.
- Technical questions or problems concerning the source code can be posted here on GitHub via the "Issues" interface.

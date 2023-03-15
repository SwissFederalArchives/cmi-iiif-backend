import config from './Config';

export interface Service {
    name: string;
    type: string;

    [propName: string]: any;
}

export interface WebService extends Service {
    runAs: 'web';
}

export const allServices: Service[] = [{
    name: 'web',
    type: 'web',
    runAs: 'web',
}
];

export let servicesRunning: Service[] = config.services.map(name => {
    const serviceFound = allServices.find(service => service.name.toLowerCase() === name.toLowerCase());
    if (!serviceFound)
        throw new Error(`No service found with the name ${name}!`);
    return {...serviceFound};
});

servicesRunning.reduce<string[]>((acc, service) => {
    if (acc.includes(service.type))
        throw new Error(`There is more than one service of type '${service.type}' configured!`);
    acc.push(service.type);
    return acc;
}, []);

if (servicesRunning.find(service => service.runAs === 'web'))
    servicesRunning = servicesRunning.map(
        service => service.runAs === 'worker' ? <Service>{...service, runAs: 'lib'} : {...service});
